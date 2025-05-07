import { useCallback, useEffect, useRef, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import { AccountInfo, Connection, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AddEntity, CreateSession, InitializeNewWorld, Provider, Session, Program, InitializeComponent, ApplySystem, anchor, FindComponentPda } from '@magicblock-labs/bolt-sdk';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// import positionComponentIdl from "../../../target/idl/position.json";
// import movementSystemIdl from "../../../target/idl/movement.json";

// import { Position } from '../../../target/types/position';
// import { Movement } from '../../../target/types/movement';

const WORLD_PDA = new PublicKey("7vdDgJqnEFwxDXER3eHmLQPu9sm3kSoHtFCC2JsLa68P");

export class SimpleProvider implements Provider {
  readonly connection: Connection;
  readonly publicKey?: PublicKey;

  constructor(connection: Connection, publicKey?: PublicKey) {
    this.connection = connection;
    this.publicKey = publicKey;
  }
}

function App() {
  const [count, setCount] = useState(0);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const provider = new SimpleProvider(connection, publicKey!);
  anchor.setProvider(provider);
  const entityPdaRef = useRef<PublicKey | null>(null);

  // const positionComponent = new Program(positionComponentIdl as Position, provider);
  // const movementSystem = new Program(movementSystemIdl as Movement, provider);

  const getWorldPda = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = await connection.getLatestBlockhashAndContext();
    const initNewWorld = await InitializeNewWorld({ payer: publicKey, connection });
    const worldPda = initNewWorld.worldPda;
    // 发送阶段
    const signature = await sendTransaction(initNewWorld.transaction, connection, { minContextSlot });
    // 确认阶段（关键！）
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature, }, "confirmed");
    console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${signature}`);
    return worldPda;
  }, [publicKey, connection, sendTransaction]);

  const createGame = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    // get world pda
    const worldPda = WORLD_PDA //await getWorldPda();
    console.log("worldPda", worldPda.toBase58());

    // create entity
    const addEntity = await AddEntity({ payer: publicKey, world: worldPda, connection });
    entityPdaRef.current = addEntity.entityPda;
    console.log("entityPda", addEntity.entityPda.toBase58());

    // // add position component to entity
    // const initPositionComponent = await InitializeComponent({
    //   payer: publicKey,
    //   entity: addEntity.entityPda,
    //   componentId: positionComponent.programId
    // });

    // // movement system
    // const applyMovementSystem = await ApplySystem({
    //   authority: publicKey,
    //   systemId: movementSystem.programId,
    //   world: worldPda,
    //   entities: [{
    //     entity: addEntity.entityPda,
    //     components: [{ componentId: positionComponent.programId }],
    //   }]
    // });

    // // add both instruction to one transaction
    // const transaction = new Transaction().add(
    //   addEntity.instruction,
    //   initPositionComponent.instruction,
    //   applyMovementSystem.instruction
    // );

    // // send transaction    
    // const signature = await sendTransaction(transaction, connection);
    // await connection.confirmTransaction(signature);
    // console.log("🚀 ~ createGame ~ result:", signature);

  }, [publicKey, connection, sendTransaction, /*movementSystem.programId, positionComponent.programId*/]);

  // useEffect(() => {
  //   if (!publicKey) return;
  //   if (!entityPdaRef.current) return;
  //   const positionSubscription = connection.onAccountChange(positionComponent.programId, (updatedAccountInfo) =>
  //     console.log("Updated account info: ", updatedAccountInfo),
  //     "confirmed",
  //   );
  //   return () => {
  //     connection.removeAccountChangeListener(positionSubscription);
  //   }
  // }, [connection, publicKey, positionComponent])


  return (
    <>
      <div className='w-[1280px] m-auto'>
        <header className='p-2'>
          <WalletMultiButton />
          <Button className='mr-10 ml-1' onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </Button>
          <Button onClick={createGame}>create game</Button>
        </header>
        <canvas id='canvas' width={1280} height={720}></canvas>
      </div>
    </>
  )
}

export default App
