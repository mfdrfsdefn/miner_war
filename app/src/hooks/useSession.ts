import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program, Wallet, web3 } from '@coral-xyz/anchor';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anchor, CreateSession, FindSessionTokenPda, Session } from "@magicblock-labs/bolt-sdk";
import { Keypair, PublicKey, type Signer } from '@solana/web3.js';
import { SHA256, enc } from "crypto-js";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { type MinerWar } from "../../../target/types/miner_war";
import minerWarIdl from "../../../target/idl/miner_war.json";

function deriveSeedFromPublicKey(userPublicKey: PublicKey): Uint8Array {
  const salt = 'minerwarSalt';
  const hash = SHA256(userPublicKey.toBuffer().toString() + salt);
  const hashArray = new Uint8Array(Buffer.from(hash.toString(enc.Hex), 'hex'));
  return hashArray.slice(0, 32);
}

function deriveKeypairFromPublicKey(userPublicKey: PublicKey): Keypair {
  const seed = deriveSeedFromPublicKey(userPublicKey);
  const keypair = Keypair.fromSeed(seed);
  return keypair;
}

export function useSession() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const provider = useMemo(() => new AnchorProvider(connection as unknown as web3.Connection, wallet as unknown as Wallet), [connection, wallet]);
  anchor.setProvider(provider);
  const session = useRef<Session | null>(null);
  const [playerWallet, setPlayerWallet] = useState<Keypair>(Keypair.generate());
  const [playerKey, setPlayerKey] = useState<PublicKey>(playerWallet.publicKey);
  const playerWalletRef = useRef<Keypair>(playerWallet);


  const minerWarProgram: Program<MinerWar> = useMemo(() => new Program(minerWarIdl, provider), [provider]);

  const createSession = useCallback(
    async () => {
      if (session.current) return;
      if (!publicKey) throw new WalletNotConnectedError();
      const sessionToken = FindSessionTokenPda({ sessionSigner: playerWallet.publicKey, authority: publicKey });
      const sessionTokenInfo = await connection.getAccountInfo(sessionToken);
      console.log("🚀 ~ sessionTokenInfo:", sessionTokenInfo);
      if (!sessionTokenInfo) {
        const create_session = await CreateSession({ sessionSigner: playerWallet, authority: publicKey, topUp: new BN(100000000) });
        const blockhashAndContext = await connection.getLatestBlockhashAndContext();
        const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = blockhashAndContext;
        create_session.transaction.recentBlockhash = blockhash;
        create_session.transaction.feePayer = publicKey;
        create_session.transaction.partialSign(create_session.session.signer as Signer);
        session.current = create_session.session;
        const signature = await sendTransaction(create_session.transaction, connection, { minContextSlot });
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      } else {
        session.current = new Session(playerWallet, sessionToken);
      }
    },
    [publicKey, playerWallet, connection, sendTransaction],
  );

  useEffect(() => {
    if (publicKey) {
      const newWallet = deriveKeypairFromPublicKey(publicKey);
      setPlayerWallet(newWallet);
      setPlayerKey(newWallet.publicKey);
      playerWalletRef.current = newWallet;
    }
  }, [publicKey]);

  return {
    session,
    provider,
    publicKey,
    playerKey,
    connection,
    playerWallet,
    createSession,
    sendTransaction,
    minerWarProgram
  }
}