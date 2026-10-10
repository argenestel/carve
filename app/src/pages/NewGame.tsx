// SPDX-License-Identifier: Apache-2.0
import { type Placement, randomPlacement } from "@salvo/contract";
import { useState } from "react";
import { go, useWallet } from "../App";
import { createGame, makeProviders, openGame, takeSeat } from "../lib/game";
import { FleetEditor } from "./FleetEditor";
import { Busy, errorText } from "./ui";

const CLOCKS = [
  { label: "10 min", secs: 600n },
  { label: "1 hour", secs: 3600n },
  { label: "1 day", secs: 86400n },
];

export const NewGame = () => {
  const { connect } = useWallet();
  const [ships, setShips] = useState<Placement[]>(randomPlacement);
  const [clock, setClock] = useState(1);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    let address: string | null = null;
    try {
      const w = await connect();
      const p = await makeProviders(w);
      setStep("Deploying the game · 1 of 2");
      address = await createGame(p, CLOCKS[clock].secs, ships);
      setStep("Committing your fleet · 2 of 2");
      await takeSeat(await openGame(p, address));
      go(`/g/${address}`);
    } catch (e) {
      // Deployed but not seated: the game page offers to finish.
      if (address) go(`/g/${address}`);
      else setError(errorText(e));
    } finally {
      setStep(null);
    }
  };

  return (
    <main className="setup">
      <div className="setup-board">
        <FleetEditor ships={ships} onChange={setShips} disabled={!!step} />
      </div>
      <aside className="setup-side">
        <h1>Deploy your fleet</h1>
        <p className="muted">Only a hash of this layout goes on-chain.</p>
        <label className="field-label">Time per move</label>
        <div className="chips">
          {CLOCKS.map((c, i) => (
            <button key={c.label} type="button" className={`chip ${i === clock ? "on" : ""}`} onClick={() => setClock(i)} disabled={!!step}>
              {c.label}
            </button>
          ))}
        </div>
        <button className="btn primary big" onClick={create} disabled={!!step}>
          {step ? <Busy label={step} /> : "Create game"}
        </button>
        <p className="fine">Two approvals in Lace: one to deploy the game, one to prove and commit your fleet.</p>
        {error && <p className="error">{error}</p>}
      </aside>
    </main>
  );
};
