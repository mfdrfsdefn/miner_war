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
import { useSession } from "@/hooks/useSession";
import { AddEntity, InitializeNewWorld } from "@magicblock-labs/bolt-sdk";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import type { Signer } from "@solana/web3.js";
import { useCallback, useRef, useState } from "react";

export function CreateGame({ getGames }: { getGames: () => Promise<void> }) {
  const [gameName, setGameName] = useState("");
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const { createSession, playerKey, connection, publicKey, session, minerWarProgram } = useSession();
  const [createGameLoading, setCreateGameLoading] = useState(false);

  const createGame = useCallback(async () => {
    if (!playerKey) throw new WalletNotConnectedError();
    setCreateGameLoading(true);
    try {
      // 创建session
      await createSession();
      console.log("~ createGame ~ session:", session.current?.sessionToken.toBase58());
      // 创建游戏世界
      const signer = session.current?.signer as Signer;
      const initNewWorld = await InitializeNewWorld({ payer: playerKey, connection });
      const initWorldSn = await connection.sendTransaction(initNewWorld.transaction, [signer]);
      await connection.confirmTransaction(initWorldSn, "confirmed");
      console.log("🚀 ~ createGame ~ initNewWorld:", initNewWorld.worldId.toNumber(), initNewWorld.worldPda.toBase58());
      // 创建实体
      const addEntity = await AddEntity({ payer: playerKey, world: initNewWorld.worldPda, connection });
      console.log("🚀 ~ createGame ~ addEntity:", addEntity.entityPda.toBase58());
      // 初始化游戏
      const tx = await minerWarProgram.methods
        .newGame(initNewWorld.worldId.toNumber(), gameName, playerKey)
        .accounts({ payer: playerKey })
        .transaction();
      const initGameSn = await connection.sendTransaction(tx, [signer]);
      await connection.confirmTransaction(initGameSn, "confirmed");
      setCreateGameLoading(false);
      getGames();
    } catch (error) {
      console.log("🚀 ~ createGame ~ error:", error);
      setCreateGameLoading(false);
    }
    dialogCloseRef.current?.click();
  }, [connection, createSession, gameName, getGames, minerWarProgram.methods, playerKey, session]);

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
