import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program, Wallet, web3 } from '@coral-xyz/anchor';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anchor, CreateSession, FindSessionTokenPda, Session, SessionProgram } from "@magicblock-labs/bolt-sdk";
import { Keypair, PublicKey, type Signer } from '@solana/web3.js';
import { SHA256, enc } from "crypto-js";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { type MinerWar } from "../../../target/types/miner_war";
import { type Map } from "../../../target/types/map";
import { type Player } from "../../../target/types/player";
import { type Prizepool } from "../../../target/types/prizepool";

import { type InitMap } from "../../../target/types/init_map";
import { type InitPlayer } from "../../../target/types/init_player";
import { type InitPrizepool } from "../../../target/types/init_prizepool";
import { type CashOut } from "../../../target/types/cash_out";
import { type Battle } from "../../../target/types/battle";
import { type Mine } from "../../../target/types/mine";
import { type PayEntry } from "../../../target/types/pay_entry";


import minerWarIdl from "../../../target/idl/miner_war.json";
import mapIdl from "../../../target/idl/map.json";
import playerIdl from "../../../target/idl/player.json";
import prizepollIdl from "../../../target/idl/prizepool.json";

import initMapIdl from "../../../target/idl/init_map.json";
import initPlayerIdl from "../../../target/idl/init_player.json";
import initPrizepoolIdl from "../../../target/idl/init_prizepool.json";
import cashOutIdl from "../../../target/idl/cash_out.json";
import battleIdl from "../../../target/idl/battle.json";
import mineIdl from "../../../target/idl/mine.json";
import payEntryIdl from "../../../target/idl/pay_entry.json";

function deriveSeedFromPublicKey(userPublicKey: PublicKey): Uint8Array {
  const salt = 'minerwarSalt_1';
  const hash = SHA256(userPublicKey.toBuffer().toString() + salt);
  const hashArray = new Uint8Array(Buffer.from(hash.toString(enc.Hex), 'hex'));
  return hashArray.slice(0, 32);
}

function deriveKeypairFromPublicKey(userPublicKey: PublicKey): Keypair {
  const seed = deriveSeedFromPublicKey(userPublicKey);
  const keypair = Keypair.fromSeed(seed);
  return keypair;
}

export function useSessionWallet() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const provider = useMemo(() => new AnchorProvider(connection as unknown as web3.Connection, wallet as unknown as Wallet), [connection, wallet]);
  anchor.setProvider(provider);
  const session = useRef<Session | null>(null);
  const [playerWallet, setPlayerWallet] = useState<Keypair>(Keypair.generate());
  const [playerKey, setPlayerKey] = useState<PublicKey>(playerWallet.publicKey);


  const minerWarProgram: Program<MinerWar> = useMemo(() => new Program(minerWarIdl, provider), [provider]);

  const mapComponentProgram: Program<Map> = useMemo(() => new Program(mapIdl, provider), [provider]);
  const playerComponentProgram: Program<Player> = useMemo(() => new Program(playerIdl, provider), [provider]);
  const prizepoolComponentProgram: Program<Prizepool> = useMemo(() => new Program(prizepollIdl, provider), [provider]);

  const initMapSystemProgram: Program<InitMap> = useMemo(() => new Program(initMapIdl, provider), [provider]);
  const initPlayerSystemProgram: Program<InitPlayer> = useMemo(() => new Program(initPlayerIdl, provider), [provider]);
  const initPrizepoolSystemProgram: Program<InitPrizepool> = useMemo(() => new Program(initPrizepoolIdl, provider), [provider]);
  const cashOutSystemProgram: Program<CashOut> = useMemo(() => new Program(cashOutIdl, provider), [provider]);
  const battleSystemProgram: Program<Battle> = useMemo(() => new Program(battleIdl, provider), [provider]);
  const mineSystemProgram: Program<Mine> = useMemo(() => new Program(mineIdl, provider), [provider]);
  const payEntrySystemProgram: Program<PayEntry> = useMemo(() => new Program(payEntryIdl, provider), [provider]);

  type CreateSessionData = {
    sessionSigner?: Keypair;
    authority: PublicKey;
    topUp?: BN;
    validity?: BN;
  };

  const createSession = useCallback(
    async function call(isExpired = false) {
      if (!publicKey) throw new WalletNotConnectedError();
      const sessionToken = FindSessionTokenPda({ sessionSigner: playerWallet.publicKey, authority: publicKey });
      const sessionTokenInfo = await connection.getAccountInfo(sessionToken);
      if (isExpired || !sessionTokenInfo) {
        const data: CreateSessionData = { sessionSigner: playerWallet, authority: publicKey };
        if (!isExpired) data.topUp = new BN(100000000);
        const create_session = await CreateSession(data);
        const blockhashAndContext = await connection.getLatestBlockhashAndContext();
        const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = blockhashAndContext;
        create_session.transaction.recentBlockhash = blockhash;
        create_session.transaction.feePayer = publicKey;
        create_session.transaction.partialSign(create_session.session.signer as Signer);
        session.current = create_session.session;
        const signature = await sendTransaction(create_session.transaction, connection, { minContextSlot });
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      } else {
        const slot = await connection.getSlot();
        const timestamp = await connection.getBlockTime(slot);
        const data = SessionProgram.coder.accounts.decode("sessionToken", sessionTokenInfo.data);
        const remind = data.validUntil.toNumber() - timestamp!;
        if (remind < 60 * 5) {
          console.log("session will expire in 5 minutes, renewing...");
          const transaction = await SessionProgram.methods.revokeSession().accounts({ authority: publicKey, sessionToken }).transaction();
          const blockhashAndContext = await connection.getLatestBlockhashAndContext();
          const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = blockhashAndContext;
          const signature = await sendTransaction(transaction, connection, { minContextSlot });
          await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
          await call(true);
        } else {
          session.current = new Session(playerWallet, sessionToken);
        }
      }
    },
    [publicKey, playerWallet, connection, sendTransaction],
  );

  useEffect(() => {
    if (publicKey) {
      const newWallet = deriveKeypairFromPublicKey(publicKey);
      setPlayerWallet(newWallet);
      setPlayerKey(newWallet.publicKey);
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
    // program
    minerWarProgram,
    mapComponentProgram,
    playerComponentProgram,
    prizepoolComponentProgram,
    // system
    initMapSystemProgram,
    initPlayerSystemProgram,
    initPrizepoolSystemProgram,
    cashOutSystemProgram,
    battleSystemProgram,
    mineSystemProgram,
    payEntrySystemProgram,
  }
}