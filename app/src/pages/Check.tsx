// SPDX-License-Identifier: Apache-2.0
//
// A check: "is anyone licensed for this region and category today?". Whoever
// asks shares the link; the licensee opens it and answers with a proof. The
// answer shows the grant number and whether it's exclusive, nothing more.

import { CATEGORIES, REGIONS, covers, fromHex } from "@carve/contract";
import { proveRights } from "../lib/carve";
import { Busy, Copy, Notice, useNow } from "./ui";
import { useBook } from "./useBook";

export const CheckPage = ({ address, region, category, check }: { address: string; region: number; category: number; check: string }) => {
  const b = useBook(address);
  const now = useNow(30_000);
  if (!(region >= 0 && region < 8 && category >= 0 && category < 8 && /^[0-9a-f]{64}$/.test(check))) return <Notice title="That check link is broken" />;
  if (!b.valid) return <Notice title="That isn't a book address" />;
  if (!b.readable)
    return (
      <Notice title="Connect Lace to see this check">
        <button className="btn primary" onClick={() => b.connect().catch(() => {})}>
          Connect Lace
        </button>
      </Notice>
    );
  if (b.l === undefined) return <Notice title={<Busy label="Reading the ledger" />} />;
  if (b.l === null) return <Notice title="No book at this address on Preprod" />;

  const l = b.l;
  const q = fromHex(check);
  const answer = l.checks.member(q) ? l.checks.lookup(q) : null;
  const t = BigInt(Math.floor(now / 1000) - 120);
  const mine = Object.entries(b.ps?.held ?? {})
    .map(([id, g]) => ({ id: Number(id), g }))
    .filter(({ g }) => covers(g, region, category, t));
  const usable = mine.filter(({ id }) => l.accepted.member(BigInt(id)));

  return (
    <main className="check">
      <span className="eyebrow">Check · {l.title}</span>
      <h1>
        Licensed for <em>{CATEGORIES[category]}</em> in <em>{REGIONS[region]}</em>?
      </h1>

      {answer ? (
        <div className="answer">
          <span className="stamp big">{answer.exclusive ? "Exclusive" : "Licensed"}</span>
          <p>
            Proven with grant #{Number(answer.grant) + 1}, {answer.exclusive ? "an exclusive" : "a non-exclusive"} license in force on{" "}
            {new Date(Number(answer.at) * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
          </p>
          <p className="fine">The licensee proved this in zero knowledge against their grant's commitment. Their other regions, dates and terms stay private.</p>
        </div>
      ) : (
        <div className="waiting">
          <p>
            <span className="spin" /> Waiting for the licensee to prove it.
          </p>
          <div className="share">
            <span className="mono">{location.href}</span>
            <Copy text={location.href} label="Copy link" />
          </div>
          <p className="fine">Send this link to whoever claims the rights. The answer appears here when their proof lands.</p>

          {usable.length > 0 && (
            <div className="prove">
              <p>
                <b>You hold grant #{usable[0].id + 1}</b>, which covers this today.
              </p>
              <button className="btn primary big" disabled={!!b.busy} onClick={() => b.run("Proving your rights", (c) => proveRights(c, usable[0].id, region, category, q))}>
                {b.busy ? <Busy label={b.busy} /> : "Prove it"}
              </button>
            </div>
          )}
          {usable.length === 0 && mine.length > 0 && <p className="fine">You hold grant #{mine[0].id + 1}, but accept it before using it.</p>}
          {b.error && <p className="error">{b.error}</p>}
        </div>
      )}
    </main>
  );
};
