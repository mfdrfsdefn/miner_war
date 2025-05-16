import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSessionWallet } from "@/hooks/useSessionWallet";
import { AddEntity, ApplySystem, InitializeComponent, InitializeNewWorld, Session } from "@magicblock-labs/bolt-sdk";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction, type Signer } from "@solana/web3.js";
import { useCallback, useRef, useState } from "react";

export function CreateGame({ getGames }: { getGames: () => Promise<void> }) {
  const [gameName, setGameName] = useState("");
  const [tokenMintAdrees, setTokenMintAdress] = useState("AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp");
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const { createSession, playerKey, connection, publicKey, session, minerWarProgram, mapComponentProgram, initPrizepoolSystemProgram, initMapSystemProgram, cashOutSystemProgram, prizepoolComponentProgram } = useSessionWallet();
  const [createGameLoading, setCreateGameLoading] = useState(false);

  const createGame = useCallback(async () => {
    if (gameName.length === 0) throw new Error("Game name is required");
    if (!playerKey) throw new WalletNotConnectedError();
    if (!tokenMintAdrees) throw new Error("Token mint address is required");
    const tokenMintInfo = await connection.getAccountInfo(new PublicKey(tokenMintAdrees));
    if (!tokenMintInfo) throw new Error("Token mint not found");
    setCreateGameLoading(true);
    try {
      // 创建session
      await createSession();
      // 创建游戏世界
      const signer = session.current?.signer as Signer;
      const initWorld = await InitializeNewWorld({ payer: playerKey, connection });
      const worldPda = initWorld.worldPda;
      const initGameSn = await connection.sendTransaction(initWorld.transaction, [signer]);
      await connection.confirmTransaction(initGameSn, "confirmed");
      // 初始化地图
      const mapSeed = new Uint8Array(Buffer.from("map"));
      const mapEntity = await AddEntity({ payer: playerKey, world: worldPda, seed: mapSeed, connection });
      const mapComponent = await InitializeComponent({
        payer: playerKey,
        entity: mapEntity.entityPda,
        componentId: mapComponentProgram.programId
      });
      const initMapSystem = await ApplySystem({
        authority: playerKey,
        world: worldPda,
        systemId: initMapSystemProgram.programId,
        session: session.current as Session,
        entities: [{
          entity: mapEntity.entityPda,
          components: [{ componentId: mapComponentProgram.programId }]
        }],
        args: { buy_in: 100.0 }
      });
      const createGameTx = new Transaction().add(mapEntity.instruction, mapComponent.instruction, initMapSystem.instruction);

      // 初始化奖池
      const prizepoolSeed = new Uint8Array(Buffer.from("prizepool"));
      const prizepoolEntity = await AddEntity({ payer: playerKey, world: worldPda, seed: prizepoolSeed, connection });
      const prizepoolComponent = await InitializeComponent({ payer: playerKey, entity: prizepoolEntity.entityPda, componentId: prizepoolComponentProgram.programId });

      const decimals = 9;
      const mint_of_token = new PublicKey(tokenMintAdrees);
      const vault_program_id = cashOutSystemProgram.programId;
      const mapComponentPdaBuffer = mapComponent.componentPda.toBuffer();
      const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync([Buffer.from("token_account_owner_pda"), mapComponentPdaBuffer], vault_program_id);
      const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);
      const owner_token_account = await getAssociatedTokenAddress(mint_of_token, publicKey!);
      const createTokenAccountTx = createAssociatedTokenAccountInstruction(playerKey, tokenVault, tokenAccountOwnerPda, mint_of_token);

      const initPrizepoolSystem = await ApplySystem({
        authority: playerKey,
        world: worldPda,
        systemId: initPrizepoolSystemProgram.programId,
        session: session.current as Session,
        entities: [
          {
            entity: prizepoolEntity.entityPda,
            components: [{ componentId: prizepoolComponentProgram.programId }],
          },
          {
            entity: mapEntity.entityPda,
            components: [{ componentId: mapComponentProgram.programId }],
          },
        ],
        args: {
          vault_token_account_string: tokenVault.toString(),
          token_string: mint_of_token.toString(),
          token_decimals: decimals,
          gamecreater_wallet_string: owner_token_account.toString(),
        }
      });

      createGameTx.add(prizepoolEntity.transaction, prizepoolComponent.transaction, createTokenAccountTx, initPrizepoolSystem.transaction);

      // 添加到游戏列表
      const newGameTx = await minerWarProgram.methods
        .newGame(initWorld.worldId.toNumber(), gameName, playerKey)
        .accounts({ payer: playerKey })
        .transaction();

      createGameTx.add(newGameTx);
      const newGameSn = await connection.sendTransaction(createGameTx, [signer]);
      await connection.confirmTransaction(newGameSn, "confirmed");
      console.log("init game success");

      setCreateGameLoading(false);
      getGames();
    } catch (error) {
      console.log("🚀 ~ createGame ~ error:", error);
      setCreateGameLoading(false);
    }
    dialogCloseRef.current?.click();
  }, [gameName, playerKey, tokenMintAdrees, connection, createSession, session, mapComponentProgram.programId, initMapSystemProgram.programId, prizepoolComponentProgram.programId, cashOutSystemProgram.programId, publicKey, initPrizepoolSystemProgram.programId, minerWarProgram.methods, getGames]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='mr-2'>Create Game</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create Game</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Game Name
            </Label>
            <Input id="game_name" placeholder="Input Game Name" required value={gameName} className="col-span-4" onChange={(e) => setGameName(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Token Mint
            </Label>
            <Input id="game_owner" value={tokenMintAdrees} onChange={(e) => setTokenMintAdress(e.target.value)} className="col-span-4" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Game Owner
            </Label>
            <Input id="game_owner" value={publicKey?.toBase58()} disabled className="col-span-4" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => dialogCloseRef.current?.click()} >
            Cancel
          </Button>
          <Button type="submit" onClick={createGame} disabled={createGameLoading}>
            {createGameLoading ? "Creating..." : "Create"}
          </Button>
          <DialogClose ref={dialogCloseRef} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
