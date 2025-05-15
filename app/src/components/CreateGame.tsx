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
import { InitializeNewWorld } from "@magicblock-labs/bolt-sdk";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { type Signer } from "@solana/web3.js";
import { useCallback, useRef, useState } from "react";

export function CreateGame({ getGames }: { getGames: () => Promise<void> }) {
  const [gameName, setGameName] = useState("");
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const { createSession, playerKey, connection, publicKey, session, minerWarProgram } = useSessionWallet();
  const [createGameLoading, setCreateGameLoading] = useState(false);

  const createGame = useCallback(async () => {
    if (!playerKey) throw new WalletNotConnectedError();
    setCreateGameLoading(true);
    try {
      // 创建session
      await createSession();

      // 创建游戏世界
      const signer = session.current?.signer as Signer;
      const initNewWorld = await InitializeNewWorld({ payer: playerKey, connection });
      // 添加到游戏列表
      const newGameTx = await minerWarProgram.methods
        .newGame(initNewWorld.worldId.toNumber(), gameName, playerKey)
        .accounts({ payer: playerKey })
        .transaction();

      newGameTx.add(initNewWorld.transaction);
      const initGameSn = await connection.sendTransaction(newGameTx, [signer]);
      await connection.confirmTransaction(initGameSn, "confirmed");
      setCreateGameLoading(false);
      getGames();
    } catch (error) {
      console.log("🚀 ~ createGame ~ error:", error);
      setCreateGameLoading(false);
    }
    dialogCloseRef.current?.click();
  }, [playerKey, createSession, session, connection, minerWarProgram.methods, gameName, getGames]);

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
