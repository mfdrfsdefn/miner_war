import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CreateGame } from './components/CreateGame';
import { useSessionWallet } from './hooks/useSessionWallet';
import { useCallback, useEffect, useState } from 'react';
import { PublicKey, Transaction, type Signer } from '@solana/web3.js';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  // TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from './components/ui/button';
import { AddEntity, ApplySystem, BN, FindWorldPda, InitializeComponent, Session } from '@magicblock-labs/bolt-sdk';

interface Game {
  id: number;
  name: string;
  status: string;
  owner: string;
  loading: boolean;
}
function App() {
  const { publicKey, connection, playerKey, session, createSession, minerWarProgram, mapComponentProgram, initPrizepoolSystemProgram, initMapSystemProgram, initPlayerSystemProgram, playerComponentProgram } = useSessionWallet();
  const [list, setList] = useState<Game[]>([]);

  const handleGameInit = useCallback(async (worldId: number) => {
    await createSession();
    const signer = session.current?.signer as Signer;

    const worldPda = FindWorldPda({ worldId: new BN(worldId) });

    const tx = new Transaction();

    // 创建地图实体
    const mapSeed = new Uint8Array(Buffer.from("map"));
    const mapEntity = await AddEntity({ payer: playerKey, world: worldPda, seed: mapSeed, connection });
    const mapComponent = await InitializeComponent({ payer: playerKey, entity: mapEntity.entityPda, componentId: mapComponentProgram.programId });
    // 初始化地图
    const initMapSystem = await ApplySystem({
      authority: signer.publicKey,
      world: worldPda,
      systemId: initMapSystemProgram.programId,
      session: session.current as Session,
      entities: [{ entity: mapEntity.entityPda, components: [{ componentId: mapComponentProgram.programId }] }],
      args: { buy_in: 100.0 }
    });
    tx.add(mapEntity.transaction, mapComponent.transaction, initMapSystem.transaction);
    // 玩家
    ['player1', 'player2'].forEach(async (player) => {
      const playerSeed = new Uint8Array(Buffer.from(player));
      const playerEntity = await AddEntity({ payer: playerKey, world: worldPda, seed: playerSeed, connection });
      const playerComponent = await InitializeComponent({ payer: playerKey, entity: playerEntity.entityPda, componentId: minerWarProgram.programId });
      const initPlayerSystem = await ApplySystem({
        authority: playerKey,
        world: worldPda,
        systemId: initPlayerSystemProgram.programId,
        session: session.current as Session,
        entities: [{
          entity: playerEntity.entityPda,
          components: [{ componentId: playerComponentProgram.programId }]
        }, {
          entity: mapEntity.entityPda,
          components: [{ componentId: mapComponentProgram.programId }]
        }]
      });
      tx.add(playerComponent.transaction, initPlayerSystem.transaction);
    })

    // // 创建奖池实体
    // const prizepoolSeed = new Uint8Array(Buffer.from("prizepool"));
    // const prizepoolEntity = await AddEntity({ payer: playerKey, world: worldPda, seed: prizepoolSeed, connection });
    // const prizepoolComponent = await InitializeComponent({ payer: playerKey, entity: prizepoolEntity.entityPda, componentId: minerWarProgram.programId });

    // const initPrizepoolSystem = await ApplySystem({
    //   authority: playerKey,
    //   world: worldPda,
    //   systemId: initPrizepoolSystemProgram.programId,
    //   session: session.current as Session,
    //   entities: [
    //     {
    //       entity: prizepoolEntity.entityPda,
    //       components: [],
    //     },
    //   ],
    // });

    // tx.add(prizepoolComponent.instruction);

    const signature1 = await connection.sendTransaction(tx, [signer]);
    await connection.confirmTransaction(signature1, "confirmed");

    console.log("init map entity", signature1);

  }, [connection, createSession, initMapSystemProgram.programId, initPlayerSystemProgram.programId, initPrizepoolSystemProgram.programId, mapComponentProgram.programId, minerWarProgram.programId, playerComponentProgram.programId, playerKey, session]);

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
    await createSession();
    const signer = session.current?.signer as Signer;
    setList(list => list.map(item => item.id === id ? { ...item, loading: true, } : item));
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
    getGames()
  }, [getGames, minerWarProgram, publicKey])

  return (
    <div className='h-dvh w-dvw relative flex items-center flex-col justify-center'>
      <div className="absolute left-4 top-4">
        <h1 className="text-4xl font-bold font-serif">Miner War</h1>
      </div>
      <div className="absolute top-4 right-4">
        <WalletMultiButton />
      </div>
      {publicKey && <CreateGame getGames={getGames} />}
      <Table className='max-w-[1000px] m-auto'>
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
                <Button size="sm" variant="outline" disabled={game.owner !== playerKey.toBase58()} onClick={() => handleGameInit(game.id)}>Init</Button>
                <Button className='ml-2' size="sm">Join</Button>
                <Button className='ml-2' onClick={() => handleRemove(game.id)} size="sm" variant="destructive" disabled={game.owner !== playerKey.toBase58() || game.loading}>{game.loading ? "Closing" : "Close"}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* <div className='w-[1280px] h-[720px] outline outline-black'></div> */}
    </div>
  )
}

export default App
