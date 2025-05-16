import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CreateGame } from './components/CreateGame';
import { useSessionWallet } from './hooks/useSessionWallet';
import { useCallback, useEffect, useState } from 'react';
import { PublicKey, SystemProgram, Transaction, type Signer } from '@solana/web3.js';

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

interface Game {
  id: number;
  name: string;
  status: string;
  owner: string;
  loading: boolean;
}
function App() {
  const { publicKey, connection, playerKey, session, createSession, minerWarProgram, payEntrySystemProgram, mapComponentProgram, prizepoolComponentProgram, playerComponentProgram, sendTransaction } = useSessionWallet();
  const [list, setList] = useState<Game[]>([]);

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

    console.log("init join game success");

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
                <Button className='ml-2' size="sm" onClick={() => handlePlay(game.id)}>Play</Button>
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
