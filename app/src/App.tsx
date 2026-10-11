// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useEffect, useState } from "react";
import "./lib/network";
import { type Wallet, WalletError, connectWallet, shortAddress } from "./lib/wallet";
import { setWalletIndexer } from "./lib/carve";
import { BookPage } from "./pages/Book";
import { CheckPage } from "./pages/Check";
import { Home } from "./pages/Home";
import { LicensePage } from "./pages/License";
import { LicensesPage } from "./pages/Licenses";
import { NewBook } from "./pages/NewBook";

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
  const [path] = hash.replace(/^#/, "").split("?");
  return { parts: path.split("/").filter(Boolean) };
};

export const go = (to: string) => {
  location.hash = to;
};

export const App = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { parts } = useRoute();

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
            Carve
          </a>
          <span className="pill net">Preprod</span>
          <span className="grow" />
          <nav className="nav">
            <a href="#/new" className={parts[0] === "new" || parts[0] === "b" ? "on" : ""}>
              Books
            </a>
            <a href="#/me" className={parts[0] === "me" || parts[0] === "l" ? "on" : ""}>
              Licenses
            </a>
          </nav>
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
        <Route parts={parts} />
      </div>
    </Ctx.Provider>
  );
};

const Route = ({ parts }: { parts: string[] }) => {
  const [page, a, b, c, d] = parts;
  if (page === "new") return <NewBook />;
  if (page === "me") return <LicensesPage />;
  if (page === "b" && a) return <BookPage key={a} address={a} />;
  if (page === "l" && a) return <LicensePage key={a} code={a} />;
  if (page === "c" && a && d) return <CheckPage key={d} address={a} region={Number(b)} category={Number(c)} check={d} />;
  return <Home />;
};
