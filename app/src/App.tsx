import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CreateGame } from './components/CreateGame';
import { useSessionWallet } from './hooks/useSessionWallet';
import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, Transaction, type AccountInfo, type Signer } from '@solana/web3.js';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from './components/ui/button';
import { AddEntity, ApplySystem, FindComponentPda, FindEntityPda, FindWorldPda, InitializeComponent } from '@magicblock-labs/bolt-sdk';
import { BN } from 'bn.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { cn } from './lib/utils';

interface Game {
  id: number;
  name: string;
  status: string;
  owner: string;
  loading: boolean;
}

interface PlayerData {
  mine_amount: number;
  weapon_amount: number;
  mining_speed: number;
  can_attack: boolean;
}

function App() {
  const { publicKey, connection, playerKey, session, createSession, minerWarProgram, payEntrySystemProgram, mapComponentProgram, prizepoolComponentProgram, playerComponentProgram, sendTransaction, mineSystemProgram } = useSessionWallet();
  const [list, setList] = useState<Game[]>([]);
  const [playerComponentPda, setPlayerComponentPda] = useState<PublicKey | void>(() => {
    const pda = localStorage.getItem("playerComponentPda");
    return pda ? new PublicKey(pda) : void 0;
  });

  const [currentMapPda, setCurrentMapPda] = useState<PublicKey | void>();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [miningInterval, setMiningInterval] = useState<NodeJS.Timeout | null>(null);
  const [operationQueue, setOperationQueue] = useState<{
    type: 'buyMachine' | 'buyWeapon' | 'battle';
    timestamp: number;
  }[]>([]);
  const [operationStatus, setOperationStatus] = useState<{
    type: string;
    status: 'pending' | 'success' | 'failed';
    message: string;
  } | null>(null);
  const [worldPda, setWorldPda] = useState<PublicKey | null>(null);
  const [playerEntityPda, setPlayerEntityPda] = useState<PublicKey | null>(null);

  const handlePlay = useCallback(async (id: number) => {
    if (!publicKey) throw new WalletNotConnectedError();
    await createSession();
    const signer = session.current?.signer as Signer;
    const worldPda = FindWorldPda({ worldId: new BN(id) });
    const mapSeed = new Uint8Array(Buffer.from("map"));
    const mapEntityPda = FindEntityPda({ worldId: new BN(id), seed: mapSeed });
    const prizepoolSeed = new Uint8Array(Buffer.from("prizepool"));
    const prizepoolEntityPda = FindEntityPda({ worldId: new BN(id), seed: prizepoolSeed });
    const prizepoolComponentPda = FindComponentPda({ entity: prizepoolEntityPda, componentId: prizepoolComponentProgram.programId });

    const playerEntity = await AddEntity({ payer: playerKey, world: worldPda, connection });
    const playerEntityPda = playerEntity.entityPda;
    const playerComponent = await InitializeComponent({ payer: playerKey, entity: playerEntityPda, componentId: playerComponentProgram.programId });

    const playerTx = new Transaction();
    playerTx.add(playerEntity.transaction, playerComponent.transaction);
    const playerSn = await connection.sendTransaction(playerTx, [signer]);
    await connection.confirmTransaction(playerSn, "confirmed");

    const prizepoolInfo = await connection.getAccountInfo(prizepoolComponentPda);
    const prizepoolData = prizepoolComponentProgram.coder.accounts.decode("prizepool", prizepoolInfo!.data);
    const vault_token_account = prizepoolData.vaultTokenAccount;
    const payout_token_account = await getAssociatedTokenAddress(prizepoolData.token, publicKey);

    const payEntrySystem = await ApplySystem({
      authority: publicKey,
      world: worldPda,
      systemId: payEntrySystemProgram.programId,
      entities: [
        {
          entity: mapEntityPda,
          components: [{ componentId: mapComponentProgram.programId }],
        },
        {
          entity: prizepoolEntityPda,
          components: [{ componentId: prizepoolComponentProgram.programId }],
        },
        {
          entity: playerEntityPda,
          components: [{ componentId: playerComponentProgram.programId }],
        }
      ],
      extraAccounts: [
        {
          pubkey: vault_token_account,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: playerKey,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: payout_token_account,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: publicKey,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: SystemProgram.programId,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: TOKEN_PROGRAM_ID,
          isWritable: false,
          isSigner: false,
        }
      ]
    });

    const payEntrySn = await sendTransaction(payEntrySystem.transaction, connection);
    await connection.confirmTransaction(payEntrySn, "confirmed");

    setPlayerComponentPda(playerComponent.componentPda);

    console.log("init pay entry success");

  }, [connection, createSession, mapComponentProgram.programId, payEntrySystemProgram.programId, playerComponentProgram.programId, playerKey, prizepoolComponentProgram.coder.accounts, prizepoolComponentProgram.programId, publicKey, sendTransaction, session]);

  const getGames = useCallback(async () => {
    const [gamesPda] = PublicKey.findProgramAddressSync([Buffer.from("games")], minerWarProgram.programId);
    minerWarProgram.account.games.fetch(gamesPda).then(games => {
      console.log("🚀 ~ minerWarProgram.account.games.fetch ~ games:", games)
      const data = games.list.map(game => ({
        id: game.id,
        name: game.name,
        status: game.status.created ? "created" : "started",
        owner: game.owner.toBase58(),
        loading: false,
      }));
      setList(data);
    });
  }, [minerWarProgram]);

  const handleRemove = useCallback(async (id: number) => {
    setList(list => list.map(item => item.id === id ? { ...item, loading: true, } : item));
    await createSession();
    const signer = session.current?.signer as Signer;
    const [gamesPda] = PublicKey.findProgramAddressSync([Buffer.from("games")], minerWarProgram.programId);
    const tx = await minerWarProgram.methods
      .removeGame(id)
      .accounts({ payer: playerKey, games: gamesPda })
      .transaction();
    const sn = await connection.sendTransaction(tx, [signer]);
    await connection.confirmTransaction(sn, "confirmed");
    await getGames();
  }, [createSession, minerWarProgram, playerKey, connection, session, getGames]);

  useEffect(() => {
    if (!publicKey) return;
    getGames();
  }, [getGames, minerWarProgram, publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    if (!playerComponentPda) return;
    localStorage.setItem("playerComponentPda", playerComponentPda.toBase58());
    const onChange = (accountInfo: AccountInfo<Buffer<ArrayBufferLike>> | null) => {
      if (!accountInfo) throw new Error("accountInfo is null");
      const playerData = playerComponentProgram.coder.accounts.decode("player", accountInfo.data);
      if (playerData.map?.toBase58()) {
        setCurrentMapPda(playerData.map);
      }
    }
    connection.getAccountInfo(playerComponentPda).then(onChange);
    console.log("~ useEffect ~ playerComponentPda:", playerComponentPda);
    const subscribePlayerComponentPda = connection.onAccountChange(playerComponentPda, onChange);
    return () => {
      connection.removeAccountChangeListener(subscribePlayerComponentPda);
    }
  }, [playerComponentPda, connection, playerComponentProgram.coder.accounts, publicKey]);

  // 购买机器
  const handleBuyMachine = useCallback(async () => {
    try {
      // 实现购买机器的逻辑
      setOperationStatus({
        type: 'buyMachine',
        status: 'success',
        message: 'Machine purchased successfully'
      });
    } catch (error: any) {
      console.error('Buy machine failed:', error);
      setOperationStatus({
        type: 'buyMachine',
        status: 'failed',
        message: `Failed to buy machine: ${error.message}`
      });
    }
  }, []);

  // 购买武器
  const handleBuyWeapon = useCallback(async () => {
    try {
      // 实现购买武器的逻辑
      setOperationStatus({
        type: 'buyWeapon',
        status: 'success',
        message: 'Weapon purchased successfully'
      });
    } catch (error: any) {
      console.error('Buy weapon failed:', error);
      setOperationStatus({
        type: 'buyWeapon',
        status: 'failed',
        message: `Failed to buy weapon: ${error.message}`
      });
    }
  }, []);

  // 战斗
  const handleBattle = useCallback(async () => {
    try {
      // 实现战斗的逻辑
      setOperationStatus({
        type: 'battle',
        status: 'success',
        message: 'Battle completed successfully'
      });
    } catch (error: any) {
      console.error('Battle failed:', error);
      setOperationStatus({
        type: 'battle',
        status: 'failed',
        message: `Battle failed: ${error.message}`
      });
    }
  }, []);

  // 处理其他操作的函数
  const handleOperation = useCallback(async (type: 'buyMachine' | 'buyWeapon' | 'battle') => {
    try {
      switch (type) {
        case 'buyMachine':
          await handleBuyMachine();
          break;
        case 'buyWeapon':
          await handleBuyWeapon();
          break;
        case 'battle':
          await handleBattle();
          break;
      }
    } catch (error: any) {
      console.error(`Operation ${type} failed:`, error);
      setOperationStatus({
        type,
        status: 'failed',
        message: `Operation failed: ${error.message}`
      });
    }
  }, [handleBuyMachine, handleBuyWeapon, handleBattle]);

  // 自动挖矿函数
  const startAutoMining = useCallback(async () => {
    if (!worldPda || !playerEntityPda || !publicKey || !currentMapPda) return;
    
    // 设置定时器，每5秒执行一次挖矿
    const interval = setInterval(async () => {
      try {
        // 获取地图状态
        const mapInfo = await connection.getAccountInfo(currentMapPda as PublicKey);
        if (!mapInfo) return;
        const mapData = mapComponentProgram.coder.accounts.decode("map", mapInfo.data);
        
        // 检查游戏状态
        if (!mapData.isStart) {
          console.log("Game has not started yet");
          return;
        }
        
        if (mapData.gameTime >= mapData.totalGameTime) {
          console.log("Game has finished");
          clearInterval(interval);
          setMiningInterval(null);
          return;
        }

        // 获取玩家组件信息
        const playerComponentInfo = await connection.getAccountInfo(playerComponentPda as PublicKey);
        if (!playerComponentInfo) return;
        const playerData = playerComponentProgram.coder.accounts.decode("player", playerComponentInfo.data);

        // 获取另一个玩家的组件
        const otherPlayerIndex = mapData.players.findIndex((p: PublicKey | null) => p?.toBase58() !== playerData.map?.toBase58());
        if (otherPlayerIndex === -1) {
          console.log("Waiting for another player");
          return;
        }
        const otherPlayerPda = mapData.players[otherPlayerIndex];
        if (!otherPlayerPda) {
          console.log("Other player not found");
          return;
        }

        // 执行挖矿系统
        const mineSystem = await ApplySystem({
          authority: publicKey,
          world: worldPda,
          systemId: mineSystemProgram.programId,
          entities: [
            {
              entity: playerEntityPda as PublicKey,
              components: [{ componentId: playerComponentProgram.programId }],
            },
            {
              entity: otherPlayerPda,
              components: [{ componentId: playerComponentProgram.programId }],
            },
            {
              entity: currentMapPda as PublicKey,
              components: [{ componentId: mapComponentProgram.programId }],
            }
          ]
        });

        // 发送并确认交易
        const mineSn = await sendTransaction(mineSystem.transaction, connection);
        await connection.confirmTransaction(mineSn, "confirmed");

      } catch (error) {
        console.error("Mining error:", error);
        clearInterval(interval);
        setMiningInterval(null);
      }
    }, 5000);
    
    setMiningInterval(interval);
  }, [worldPda, playerEntityPda, publicKey, currentMapPda, connection, mineSystemProgram, playerComponentProgram, mapComponentProgram, sendTransaction]);

  // 当游戏开始时自动启动挖矿
  useEffect(() => {
    if (currentMapPda && worldPda && playerEntityPda && publicKey) {
      startAutoMining();
    }
  }, [currentMapPda, worldPda, playerEntityPda, publicKey, startAutoMining]);

  return (
    <div className='h-dvh w-dvw relative flex items-center flex-col justify-center'>
      <div className="absolute left-4 top-4">
        <h1 className="text-4xl font-bold font-serif">Miner War</h1>
      </div>
      <div className="absolute top-4 right-4">
        <WalletMultiButton />
      </div>
      {/* <div className={cn("w-[720px] h-[480px] outline outline-black", { "hidden": !currentMapPda })}></div> */}
      <div className={cn("w-[1000px] m-auto", { "hidden": false })}>
        {publicKey && <CreateGame getGames={getGames} />}
        {!!currentMapPda && (
          <>
            <span>current map: </span>
            <span className='ml-2 font-light text-sm'>{currentMapPda.toBase58()}</span>
          </>
        )}
        
        {/* 游戏控制面板 */}
        {!!currentMapPda && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex flex-col gap-4">
              {/* 玩家状态显示 */}
              <div className="flex gap-4">
                <div>Mining Amount: {playerData?.mine_amount || 0}</div>
                <div>Weapon Amount: {playerData?.weapon_amount || 0}</div>
                <div>Mining Speed: {playerData?.mining_speed || 0}</div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleOperation('buyMachine')}
                >
                  Buy Machine
                </Button>
                <Button 
                  onClick={() => handleOperation('buyWeapon')}
                >
                  Buy Weapon
                </Button>
                <Button 
                  onClick={() => handleOperation('battle')}
                >
                  Battle
                </Button>
              </div>

              {/* 操作状态显示 */}
              {operationStatus && (
                <div className={`p-2 rounded ${
                  operationStatus.status === 'success' ? 'bg-green-100' :
                  operationStatus.status === 'failed' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {operationStatus.message}
                </div>
              )}

              {/* 操作队列显示 */}
              {operationQueue.length > 0 && (
                <div className="text-sm text-gray-500">
                  Pending Operations: {operationQueue.length}
                </div>
              )}
            </div>
          </div>
        )}

        <Table className='max-w-[1000px] m-auto mt-5'>
          <TableCaption>Game List</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>OWNER</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-right">OPTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((game) => (
              <TableRow key={game.id}>
                <TableCell className="w-[80px]">{game.id}</TableCell>
                <TableCell>{game.name}</TableCell>
                <TableCell>{game.owner}</TableCell>
                <TableCell>{game.status}</TableCell>
                <TableCell className="text-right">
                  <Button className='ml-2' size="sm" onClick={() => handlePlay(game.id)}>BuyEntry</Button>
                  <Button className='ml-2' onClick={() => handleRemove(game.id)} size="sm" variant="destructive" disabled={game.owner !== playerKey.toBase58() || game.loading}>{game.loading ? "Closing" : "Close"}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default App
