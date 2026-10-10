// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useEffect, useState } from "react";
import "./lib/network";
import { type Wallet, WalletError, connectWallet, shortAddress } from "./lib/wallet";
import { setWalletIndexer } from "./lib/tender";
import { Home } from "./pages/Home";
import { NewTender } from "./pages/NewTender";
import { TenderPage } from "./pages/TenderPage";

type WalletCtx = { wallet: Wallet | null; connect: () => Promise<Wallet>; connecting: boolean; error: string | null };
const Ctx = createContext<WalletCtx>(null as never);
export const useWallet = () => useContext(Ctx);

const useRoute = () => {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  return { parts: path.split("/").filter(Boolean), query: new URLSearchParams(query) };
};

export const go = (to: string) => {
  location.hash = to;
};

export const App = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { parts, query } = useRoute();

  const connect = async () => {
    if (wallet) return wallet;
    setConnecting(true);
    setError(null);
    try {
      const w = await connectWallet();
      setWalletIndexer(w);
      setWallet(w);
      return w;
    } catch (e) {
      const msg = e instanceof WalletError ? e.message : `Wallet error: ${(e as Error).message}`;
      setError(msg);
      throw e;
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Ctx.Provider value={{ wallet, connect, connecting, error }}>
      <div className="page">
        <header className="bar">
          <a className="wordmark" href="#/">
            bid<span>lock</span>
          </a>
          <span className="pill net">Preprod</span>
          <span className="grow" />
          {wallet ? (
            <span className="wallet-chip" title={wallet.shieldedAddress}>
              <span className="dot" /> {shortAddress(wallet.shieldedAddress)}
            </span>
          ) : (
            <button className="switch" onClick={() => connect().catch(() => {})} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Lace"}
            </button>
          )}
        </header>
        {error && <div className="banner">{error}</div>}
        {parts[0] === "new" ? <NewTender /> : parts[0] === "t" && parts[1] ? <TenderPage address={parts[1]} query={query} /> : <Home />}
      </div>
    </Ctx.Provider>
  );
};
