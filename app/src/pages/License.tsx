// SPDX-License-Identifier: Apache-2.0
//
// A license, opened from the link the licensor sent. The licensee checks it
// against the ledger and accepts it with a proof that they are the one named.

import { CATEGORIES, type License, REGIONS, decodeLicense, indexes, termsHash, toHex } from "@carve/contract";
import { useEffect, useMemo, useState } from "react";
import { accept, holdLicense, myLicenseeId, onLedger } from "../lib/carve";
import { RightsMap } from "./RightsMap";
import { Busy, Notice, period, short } from "./ui";
import { useBook } from "./useBook";

export const LicensePage = ({ code }: { code: string }) => {
  const lic = useMemo(() => decodeLicense(code), [code]);
  if (!lic) return <Notice title="That license link is broken" />;
  return <LicenseView lic={lic} code={code} />;
};

const LicenseView = ({ lic, code }: { lic: License; code: string }) => {
  const b = useBook(lic.address);
  const g = lic.grant;
  const [termsOk, setTermsOk] = useState<boolean | null>(null);
  const mine = toHex(g.licensee) === myLicenseeId();

  useEffect(() => {
    termsHash(lic.note).then((h) => setTermsOk(toHex(h) === toHex(g.terms)));
  }, [lic, g]);
  // Keep a license addressed to this browser, so it can be accepted and used.
  useEffect(() => {
    if (mine) holdLicense(lic, code).then(b.reload);
  }, [mine, lic, code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!b.readable)
    return (
      <Notice title="Connect Lace to check this license">
        <button className="btn primary" onClick={() => b.connect().catch(() => {})}>
          Connect Lace
        </button>
      </Notice>
    );
  if (b.l === undefined) return <Notice title={<Busy label="Checking the ledger" />} />;
  if (b.l === null) return <Notice title="This license points to a book that isn't on Preprod" />;

  const l = b.l;
  const issued = onLedger(l, lic.id, g);
  const accepted = l.accepted.member(BigInt(lic.id));

  return (
    <main className="license">
      <article className="cert">
        <span className={`stamp ${g.exclusive ? "" : "soft"}`}>{g.exclusive ? "Exclusive" : "Non-exclusive"}</span>
        <span className="eyebrow">License · grant #{lic.id + 1}</span>
        <h1>{lic.title}</h1>
        <dl>
          <dt>Regions</dt>
          <dd>{indexes(g.regions).map((i) => REGIONS[i]).join(", ")}</dd>
          <dt>Categories</dt>
          <dd>{indexes(g.categories).map((i) => CATEGORIES[i]).join(", ")}</dd>
          <dt>Period</dt>
          <dd>{period(g.start, g.end)}</dd>
          {lic.note && (
            <>
              <dt>Terms</dt>
              <dd>{lic.note}</dd>
            </>
          )}
        </dl>
        <div className="cert-map">
          <RightsMap layers={[{ id: lic.id, grant: g }]} small disabled />
        </div>
      </article>

      <aside className="verify">
        <h2>Checked against the ledger</h2>
        <ul className="checks">
          <Check ok={issued} yes={`Issued: these exact terms match grant #${lic.id + 1} on the ledger`} no="Not found: the ledger has no grant with these terms" />
          <Check ok={mine} yes="Names you: it's issued to this browser's licensee ID" no={`Names someone else (${short(toHex(g.licensee))})`} />
          {termsOk !== null && <Check ok={termsOk} yes="Terms text matches the hash in the grant" no="Terms text was changed after issue" />}
          <Check ok={accepted} yes="Accepted on the ledger" no="Not accepted yet" pending />
        </ul>
        {g.exclusive && issued && <p className="fine">The contract proved, when issuing this grant, that it overlaps no other exclusive grant in this book. It can't issue one that overlaps it later.</p>}

        {!accepted && issued && mine && (
          <button className="btn primary big" disabled={!!b.busy} onClick={() => b.run("Proving you hold this grant", (c) => accept(c, lic.id), true)}>
            {b.busy ? <Busy label={b.busy} /> : "Accept license"}
          </button>
        )}
        {accepted && mine && <p className="muted">When a retailer or marketplace sends you a check link, open it in this browser to prove your rights.</p>}
        {b.error && <p className="error">{b.error}</p>}
        <a className="fine block" href={`#/b/${lic.address}`}>
          Book {short(lic.address)}
        </a>
      </aside>
    </main>
  );
};

const Check = ({ ok, yes, no, pending }: { ok: boolean; yes: string; no: string; pending?: boolean }) => (
  <li className={ok ? "ok" : pending ? "wait" : "bad"}>
    <i>{ok ? "✓" : pending ? "…" : "✕"}</i>
    {ok ? yes : no}
  </li>
);
