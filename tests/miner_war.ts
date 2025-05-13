import { PublicKey } from "@solana/web3.js";
import { MinerWar } from "../target/types/miner_war";
import {
  InitializeNewWorld,
  AddEntity,
  InitializeComponent,
  ApplySystem,
  Program
} from "@magicblock-labs/bolt-sdk"
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";

describe("miner_war", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Constants used to test the program.
  let worldPda: PublicKey;
  let entityPda: PublicKey;
  let componentPda: PublicKey;

  // const positionComponent = anchor.workspace.Position as Program<Position>;
  // const systemMovement = anchor.workspace.Movement as Program<Movement>;
  const miner_war = anchor.workspace.MinerWar as Program<MinerWar>;

  const [gamesPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("games")],
    miner_war.programId
  );

  it("NewGame", async () => {
    await miner_war.methods
      .newGame(1, "test game", provider.wallet.publicKey)
      .rpc();
    const games = await miner_war.account.games.fetch(gamesPda);
    expect(games.list.length).equal(1);
  });

  it("GameStarted", async () => {
    await miner_war.methods
      .gameStarted(1)
      .accounts({
        games: gamesPda
      })
      .rpc();
    const games = await miner_war.account.games.fetch(gamesPda);
    expect(games.list[0].status).to.have.property('started');
  });

  it("RemoveGame", async () => {
    await miner_war.methods
      .removeGame(1)
      .accounts({
        games: gamesPda
      })
      .rpc();
    const games = await miner_war.account.games.fetch(gamesPda);
    expect(games.list.length).equal(0);
  });

  // it("InitializeNewWorld", async () => {
  //   const initNewWorld = await InitializeNewWorld({
  //     payer: provider.wallet.publicKey,
  //     connection: provider.connection,
  //   });
  //   const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
  //   worldPda = initNewWorld.worldPda;
  //   console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${txSign}`);
  // });

  // it("Add an entity", async () => {
  //   const addEntity = await AddEntity({
  //     payer: provider.wallet.publicKey,
  //     world: worldPda,
  //     connection: provider.connection,
  //   });
  //   const txSign = await provider.sendAndConfirm(addEntity.transaction);
  //   entityPda = addEntity.entityPda;
  //   console.log(`Initialized a new Entity (ID=${addEntity.entityId}). Initialization signature: ${txSign}`);
  // });

  // it("Add a component", async () => {
  //   const initializeComponent = await InitializeComponent({
  //     payer: provider.wallet.publicKey,
  //     entity: entityPda,
  //     componentId: positionComponent.programId,
  //   });
  //   const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
  //   componentPda = initializeComponent.componentPda;
  //   console.log(`Initialized the grid component. Initialization signature: ${txSign}`);
  // });

  // it("Apply a system", async () => {
  //   // Check that the component has been initialized and x is 0
  //   const positionBefore = await positionComponent.account.position.fetch(
  //     componentPda
  //   );
  //   expect(positionBefore.x.toNumber()).to.equal(0);

  //   // Run the movement system
  //   const applySystem = await ApplySystem({
  //     authority: provider.wallet.publicKey,
  //     systemId: systemMovement.programId,
  //     world: worldPda,
  //     entities: [{
  //       entity: entityPda,
  //       components: [{ componentId: positionComponent.programId }],
  //     }]
  //   });
  //   const txSign = await provider.sendAndConfirm(applySystem.transaction);
  //   console.log(`Applied a system. Signature: ${txSign}`);

  //   // Check that the system has been applied and x is > 0
  //   const positionAfter = await positionComponent.account.position.fetch(
  //     componentPda
  //   );
  //   expect(positionAfter.x.toNumber()).to.gt(0);
  // });

});
