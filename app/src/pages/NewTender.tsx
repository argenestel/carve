// SPDX-License-Identifier: Apache-2.0
import { useState } from "react";
import { go, useWallet } from "../App";
import { deployTender, makeProviders } from "../lib/tender";
import { Busy, errorText } from "./ui";

const inputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const hours = (h: number) => new Date(Date.now() + h * 3600_000);

export const NewTender = () => {
  const { connect } = useWallet();
  const [title, setTitle] = useState("");
  const [ceiling, setCeiling] = useState("");
  const [closes, setCloses] = useState(inputDate(hours(24)));
  const [reveal, setReveal] = useState(inputDate(hours(48)));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const c = BigInt(ceiling.replace(/\D/g, "") || "0");
  const closesAt = new Date(closes);
  const revealUntil = new Date(reveal);
  const problem =
    !title.trim() ? "Give the tender a title" : c <= 0n ? "Set a price ceiling" : closesAt <= new Date() ? "Bidding must close in the future" : revealUntil <= closesAt ? "The reveal window must end after bidding closes" : null;

  const submit = async () => {
    setErr(null);
    try {
      setBusy("Connecting to Lace");
      const w = await connect();
      setBusy("Preparing");
      const p = await makeProviders(w);
      setBusy("Proving & approving in Lace");
      const r = await deployTender(p, { title: title.trim(), ceiling: c, closesAt, revealUntil });
      go(`/t/${r.address}`);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="form-page">
      <h1>New tender</h1>
      <label className="lbl">
        Title
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ring Road 3 resurfacing" maxLength={80} />
      </label>
      <label className="lbl">
        Price ceiling (€)
        <input className="field big-input" inputMode="numeric" value={c ? Number(c).toLocaleString("en-GB") : ""} onChange={(e) => setCeiling(e.target.value)} placeholder="1,200,000" />
      </label>
      <div className="two">
        <label className="lbl">
          Bidding closes
          <input className="field" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
        </label>
        <label className="lbl">
          Reveal window ends
          <input className="field" type="datetime-local" value={reveal} onChange={(e) => setReveal(e.target.value)} />
        </label>
      </div>
      <p className="fine">These terms are sealed into the contract and can't be changed after deployment.</p>
      <button className="cta" disabled={!!problem || !!busy} onClick={submit}>
        {busy ? <Busy label={busy} /> : "Deploy tender"}
      </button>
      {problem && !busy && <p className="hint">{problem}</p>}
      {err && <p className="warn">{err}</p>}
    </main>
  );
};
