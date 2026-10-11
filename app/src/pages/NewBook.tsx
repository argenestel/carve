// SPDX-License-Identifier: Apache-2.0
import { useState } from "react";
import { go, useWallet } from "../App";
import { createBook, makeProviders } from "../lib/carve";
import { Busy, errorText } from "./ui";

const EXAMPLES = ["Mochi the Cat (character art)", "Northbound (song, sync rights)", "Lumen (brand, franchise)"];

export const NewBook = () => {
  const { connect } = useWallet();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = title.trim();

  const open = async () => {
    setError(null);
    setBusy(true);
    try {
      const w = await connect();
      const address = await createBook(await makeProviders(w), name);
      go(`/b/${address}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="new">
      <span className="eyebrow">New book</span>
      <h1>What are you licensing?</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name && !busy) open();
        }}
      >
        <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the property" maxLength={80} disabled={busy} autoFocus />
        <div className="chips">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className="chip" onClick={() => setTitle(x)} disabled={busy}>
              {x}
            </button>
          ))}
        </div>
        <button className="btn primary big" disabled={!name || busy}>
          {busy ? <Busy label="Deploying your book" /> : "Open book"}
        </button>
      </form>
      <p className="fine">The name is public. Your grants, licensees and terms stay on this device, and only commitments go on-chain.</p>
      {error && <p className="error">{error}</p>}
    </main>
  );
};
