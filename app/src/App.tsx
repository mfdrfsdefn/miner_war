import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CreateGame } from './components/CreateGame';
import { useSessionWallet } from './hooks/useSessionWallet';
import { useCallback, useEffect, useState } from 'react';
import { PublicKey, type Signer } from '@solana/web3.js';

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

interface Game {
  id: number;
  name: string;
  status: string;
  owner: string;
  loading: boolean;
}
function App() {
  const { publicKey, connection, playerKey, session, createSession, minerWarProgram } = useSessionWallet();
  const [list, setList] = useState<Game[]>([]);

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
                {/* <Button size="sm" variant="outline" disabled={game.owner !== playerKey.toBase58()} onClick={() => handleGameInit(game.id)}>Init</Button> */}
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
