import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { CreateGame } from './components/CreateGame';
import { useSession } from './hooks/useSession';
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
  const { publicKey, connection, minerWarProgram, playerKey, session, createSession } = useSession();
  const [list, setList] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);


  // const entityPdaRef = useRef<PublicKey | null>(null);
  // const session = useRef<Session | null>(null);

  // const positionComponent: Program<Position> = useMemo(() => new Program(positionComponentIdl, provider), [provider]);
  // const movementSystem: Program<Movement> = useMemo(() => new Program(movementSystemIdl, provider), [provider]);


  // const submitTransaction = useCallback(async (transaction: Transaction): Promise<string | null> => {
  //   const {
  //     context: { slot: minContextSlot },
  //     value: { blockhash, lastValidBlockHeight }
  //   } = await connection.getLatestBlockhashAndContext();
  //   let signature = null;

  //   if (session.current) {
  //     signature = await connection.sendTransaction(transaction, [session.current.signer as Signer], { minContextSlot });
  //   } else {
  //     signature = await sendTransaction(transaction, connection, { minContextSlot })
  //   }

  //   await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');

  //   // Transaction was successful
  //   return signature;
  // }, [connection, sendTransaction]);

  // const getWorldPda = useCallback(async (): Promise<PublicKey> => {
  //   if (!publicKey) throw new WalletNotConnectedError();
  //   const initNewWorld = await InitializeNewWorld({ payer: publicKey, connection });
  //   const worldPda = initNewWorld.worldPda;
  //   const signature = await submitTransaction(initNewWorld.transaction);
  //   console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${signature}`);
  //   return worldPda;
  // }, [connection, publicKey, submitTransaction]);

  // const createSession = useCallback(
  //   async () => {
  //     const create_session = await CreateSession({
  //       authority: publicKey as PublicKey,
  //       topUp: new BN(100000000)
  //     });
  //     const blockhash = await connection.getLatestBlockhash();
  //     create_session.transaction.recentBlockhash = blockhash.blockhash;
  //     try {
  //       create_session.transaction.feePayer = publicKey as PublicKey;
  //       create_session.transaction.partialSign(create_session.session.signer as Signer);
  //     } catch (error) {
  //       console.log("Failed to sign transaction", error);
  //     }

  //     const signature = await submitTransaction(create_session.transaction)
  //     session.current = create_session.session;
  //     if (signature == null) {
  //       throw new Error("Failed to create session");
  //     }
  //   },
  //   [connection, publicKey, submitTransaction],
  // )


  // const subscribPosition = useCallback(() => {
  //   if (!entityPdaRef.current) return;
  //   console.log("subscribing to events");
  //   const positionComponentPda = FindComponentPda({ componentId: positionComponent.programId, entity: entityPdaRef.current! });
  //   connection.onAccountChange(positionComponentPda, (updatedAccountInfo) => {
  //     console.log("Updated account info: ", updatedAccountInfo)
  //     const parsedData: {
  //       x: anchor.BN;
  //       y: anchor.BN;
  //       z: anchor.BN;
  //       description: string;
  //       boltMetadata: {
  //         authority: anchor.web3.PublicKey;
  //       };
  //     } = positionComponent.coder.accounts.decode("position", updatedAccountInfo.data);
  //     console.log("position data: ", parsedData.x.toNumber());
  //   });
  //   positionComponent.account.position.fetch(positionComponentPda).then((data) => {
  //     console.log("position data: ", data.x.toNumber());
  //   })
  // }, [connection, positionComponent]);

  // const createGame = useCallback(async () => {
  //   if (!publicKey) throw new WalletNotConnectedError();
  //   await createSession();
  //   // get world pda
  //   const worldPda = WORLD_PDA // await getWorldPda();
  //   console.log("worldPda", worldPda.toBase58());

  //   // create entity
  //   const addEntity = await AddEntity({
  //     payer: session.current?.signer.publicKey as PublicKey,
  //     world: worldPda,
  //     connection
  //   });
  //   entityPdaRef.current = addEntity.entityPda;
  //   console.log("entityPda", addEntity.entityPda.toBase58());

  //   // add position component to entity
  //   const initPositionComponent = await InitializeComponent({
  //     payer: session.current?.signer.publicKey as PublicKey,
  //     entity: addEntity.entityPda,
  //     componentId: positionComponent.programId
  //   });

  //   // movement system
  //   const applyMovementSystem = await ApplySystem({
  //     authority: session.current?.signer.publicKey as PublicKey,
  //     systemId: movementSystem.programId,
  //     world: worldPda,
  //     session: session.current as Session,
  //     entities: [{
  //       entity: addEntity.entityPda,
  //       components: [{ componentId: positionComponent.programId }],
  //     }]
  //   });

  //   // add both instruction to one transaction
  //   const transaction = new Transaction().add(
  //     addEntity.instruction,
  //     initPositionComponent.instruction,
  //     applyMovementSystem.instruction
  //   );
  //   // send transaction    
  //   const signature = await submitTransaction(transaction);
  //   console.log("🚀 ~ createGame ~ result:", signature);
  //   subscribPosition();

  // }, [publicKey, createSession, connection, positionComponent.programId, movementSystem.programId, submitTransaction, subscribPosition]);


  // const handlePositionChange = useCallback(async () => {
  //   if (!publicKey) return;
  //   if (!entityPdaRef.current) return;
  //   // movement system
  //   const applyMovementSystem = await ApplySystem({
  //     authority: session.current?.signer.publicKey as PublicKey,
  //     systemId: movementSystem.programId,
  //     world: WORLD_PDA,
  //     session: session.current as Session,
  //     entities: [{
  //       entity: entityPdaRef.current,
  //       components: [{ componentId: positionComponent.programId }],
  //     }]
  //   });

  //   // submitTransaction(applyMovementSystem.transaction);
  //   const signature = await connection.sendTransaction(applyMovementSystem.transaction, [session.current?.signer as Signer]);
  //   console.log(signature);
  // }, [publicKey, movementSystem.programId, positionComponent.programId, connection]);

  // useEffect(() => {
  //   if (!publicKey) return;
  //   connection.onAccountChange(publicKey, (accountInfo) => {
  //     console.log("~ accountInfo:", accountInfo);
  //   })
  // }, [connection, publicKey]);

  const getGames = useCallback(async () => {
    const [gamesPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("games")],
      minerWarProgram.programId
    );
    minerWarProgram.account.games.fetch(gamesPda).then(games => {
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

  const handleClick = useCallback(async (id: number) => {
    setList(list => list.map(item => item.id === id ? { ...item, loading: true, } : item));
    await createSession();
    const [gamesPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("games")],
      minerWarProgram.programId
    );
    const tx = await minerWarProgram.methods
      .removeGame(id)
      .accounts({ payer: playerKey, games: gamesPda })
      .transaction();
    const sn = await connection.sendTransaction(tx, [session.current?.signer as Signer]);
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
            <TableHead className="w-[150px] text-right">OPTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((game) => (
            <TableRow key={game.id}>
              <TableCell className="w-[80px]">{game.id}</TableCell>
              <TableCell>{game.name}</TableCell>
              <TableCell>{game.owner}</TableCell>
              <TableCell>{game.status}</TableCell>
              <TableCell className="w-[150px] text-right">
                <Button className='ml-2' size="sm">Join</Button>
                <Button className='ml-2' onClick={() => handleClick(game.id)} size="sm" variant="destructive" disabled={game.owner !== playerKey.toBase58() || game.loading}>{game.loading ? "Closing" : "Close"}</Button>
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
