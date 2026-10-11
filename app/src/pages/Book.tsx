// SPDX-License-Identifier: Apache-2.0
//
// A book. The licensor sees their private rights map and issues grants;
// everyone else sees only what the ledger shows: commitments and counts.

import {
  BOOK_SIZE,
  CATEGORIES,
  type Grant,
  type Ledger,
  REGIONS,
  conflicts,
  encodeLicense,
  fromHex,
  indexes,
  makeGrant,
  randomBytes,
  startedClean,
  termsHash,
  toHex,
} from "@carve/contract";
import { useEffect, useMemo, useState } from "react";
import { go } from "../App";
import { fetchDeployLedger, grantNotes, isLicenseeId, isLicensor, issue, myLicenseeId, saveGrantNote } from "../lib/carve";
import { type Layer, RightsMap, tone } from "./RightsMap";
import { Busy, Copy, Notice, period, short } from "./ui";
import { useBook } from "./useBook";

const LENGTHS = [
  { months: 6, label: "6 mo" },
  { months: 12, label: "1 yr" },
  { months: 24, label: "2 yr" },
  { months: 36, label: "3 yr" },
];

const nextMonth = () => {
  const d = new Date();
  return `${d.getUTCFullYear() + (d.getUTCMonth() === 11 ? 1 : 0)}-${String(((d.getUTCMonth() + 1) % 12) + 1).padStart(2, "0")}`;
};
const window_ = (ym: string, months: number) => {
  const [y, m] = ym.split("-").map(Number);
  return { start: BigInt(Date.UTC(y, m - 1, 1) / 1000), end: BigInt(Date.UTC(y, m - 1 + months, 1) / 1000) };
};
const flip = (v: boolean[], i: number) => v.map((b, k) => (k === i ? !b : b));
export const licenseUrl = (code: string) => `${location.origin}${location.pathname}#/l/${code}`;

export const BookPage = ({ address }: { address: string }) => {
  const b = useBook(address);
  if (!b.valid) return <Notice title="That isn't a book address" />;
  if (!b.readable)
    return (
      <Notice title="Connect Lace to read this book">
        <button className="btn primary" onClick={() => b.connect().catch(() => {})}>
          Connect Lace
        </button>
      </Notice>
    );
  if (b.l === undefined) return <Notice title={<Busy label="Reading the ledger" />} />;
  if (b.l === null) return <Notice title="No book at this address on Preprod" />;
  return isLicensor(b.l, b.ps) ? <LicensorView address={address} b={b} l={b.l} /> : <PublicView address={address} l={b.l} />;
};

type B = ReturnType<typeof useBook>;

// ── licensor ────────────────────────────────────────────────────────────────
const LicensorView = ({ address, b, l }: { address: string; b: B; l: Ledger }) => {
  const issued = Number(l.issued);
  const book = b.ps!.book!;
  const [regions, setRegions] = useState<boolean[]>(Array(8).fill(false));
  const [categories, setCategories] = useState<boolean[]>(Array(8).fill(false));
  const [startMonth, setStartMonth] = useState(nextMonth);
  const [months, setMonths] = useState(12);
  const [exclusive, setExclusive] = useState(true);
  const [licensee, setLicensee] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [justIssued, setJustIssued] = useState<number | null>(null);
  const notes = grantNotes(address);

  const { start, end } = window_(startMonth, months);
  const draft: Grant = useMemo(
    () => makeGrant({ regions: indexes(regions), categories: indexes(categories), start, end, exclusive, licensee: new Uint8Array(32), salt: new Uint8Array(32) }),
    [regions, categories, start, end, exclusive],
  );
  const picked = regions.some(Boolean) && categories.some(Boolean);
  const clashIds = picked ? conflicts(book, issued, draft) : [];
  // Show the grants in force at any point in the draft's period.
  const layers: Layer[] = book.grants.slice(0, issued).flatMap((g, id) => (g.start < end && start < g.end ? [{ id, grant: g }] : []));
  const full = issued >= BOOK_SIZE;
  const idOk = isLicenseeId(licensee);

  const doIssue = async () => {
    const id = issued;
    const g = makeGrant({
      regions: indexes(regions),
      categories: indexes(categories),
      start,
      end,
      exclusive,
      licensee: fromHex(licensee.trim().toLowerCase()),
      terms: await termsHash(note),
      salt: randomBytes(),
    });
    const ok = await b.run(clashIds.length ? "Trying to prove no overlap" : "Proving no overlap", (c) => issue(c, g));
    if (!ok) return;
    const code = encodeLicense({ address, id, title: l.title, note, grant: g });
    saveGrantNote(address, id, { name: name.trim() || `Licensee ${short(licensee)}`, note, code });
    setJustIssued(id);
    setRegions(Array(8).fill(false));
    setCategories(Array(8).fill(false));
    setLicensee("");
    setName("");
    setNote("");
  };

  return (
    <main className="book">
      <BookHead l={l} address={address} role="Your book" />

      <div className="book-grid">
        <section className="map-side">
          <RightsMap
            layers={layers}
            draft={{ regions, categories }}
            clashIds={clashIds}
            onRegion={(i) => setRegions((v) => flip(v, i))}
            onCategory={(j) => setCategories((v) => flip(v, j))}
            disabled={!!b.busy}
          />
          <p className="caption">
            Showing grants in force {period(start, end)}. Tap regions and categories to carve out a grant. Only you can see this map.
          </p>
        </section>

        <aside className="issue">
          <h2>New grant</h2>
          <div className="field">
            <span className="field-label">Period</span>
            <div className="row">
              <input type="month" value={startMonth} onChange={(e) => e.target.value && setStartMonth(e.target.value)} disabled={!!b.busy} />
              <div className="seg">
                {LENGTHS.map((x) => (
                  <button key={x.months} type="button" className={months === x.months ? "on" : ""} onClick={() => setMonths(x.months)} disabled={!!b.busy}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <span className="field-label">Rights</span>
            <div className="seg wide">
              <button type="button" className={exclusive ? "on" : ""} onClick={() => setExclusive(true)} disabled={!!b.busy}>
                Exclusive
              </button>
              <button type="button" className={!exclusive ? "on" : ""} onClick={() => setExclusive(false)} disabled={!!b.busy}>
                Non-exclusive
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">
              Licensee ID
              <button type="button" className="link" onClick={() => setLicensee(myLicenseeId())}>
                use mine
              </button>
            </span>
            <input className={`mono ${licensee && !idOk ? "bad" : ""}`} value={licensee} onChange={(e) => setLicensee(e.target.value)} placeholder="64 hex characters from the licensee" spellCheck={false} disabled={!!b.busy} />
          </div>
          <div className="field two">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Licensee name (private)" disabled={!!b.busy} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Terms, e.g. 8% royalty" disabled={!!b.busy} />
          </div>

          <Verdict picked={picked} clashIds={clashIds} notes={notes} full={full} />

          <div className="actions">
            <button className="btn primary big" disabled={!picked || !idOk || clashIds.length > 0 || full || !!b.busy} onClick={doIssue}>
              {b.busy ? <Busy label={b.busy} /> : "Issue grant"}
            </button>
            {clashIds.length > 0 && idOk && !b.busy && (
              <button type="button" className="link" onClick={doIssue} title="Ask the contract anyway. It will refuse.">
                Try anyway
              </button>
            )}
          </div>
          {b.error && <p className="error">{b.error}</p>}
          {justIssued !== null && notes[justIssued] && <Issued id={justIssued} n={notes[justIssued]} />}
        </aside>
      </div>

      <section className="grants">
        <h2>
          Grants <span className="muted">{issued} / {BOOK_SIZE}</span>
        </h2>
        {issued === 0 && <p className="muted">Nothing issued yet.</p>}
        {book.grants.slice(0, issued).map((g, id) => (
          <GrantRow key={id} id={id} g={g} n={notes[id]} accepted={l.accepted.member(BigInt(id))} />
        ))}
      </section>
    </main>
  );
};

const Verdict = ({ picked, clashIds, notes, full }: { picked: boolean; clashIds: number[]; notes: ReturnType<typeof grantNotes>; full: boolean }) => {
  if (full) return <p className="verdict bad">This book is full (16 grants).</p>;
  if (!picked) return <p className="verdict">Pick at least one region and one category.</p>;
  if (clashIds.length)
    return (
      <p className="verdict bad">
        Clashes with {clashIds.map((i) => `#${i + 1}${notes[i]?.name ? ` (${notes[i].name})` : ""}`).join(", ")}. The contract won't issue it.
      </p>
    );
  return <p className="verdict ok">Clear. No exclusive grant overlaps this.</p>;
};

const Issued = ({ id, n }: { id: number; n: { name: string; code: string } }) => (
  <div className="issued">
    <b>Grant #{id + 1} issued.</b> Send {n.name} their license link, privately:
    <div className="share">
      <span className="mono">{licenseUrl(n.code)}</span>
      <Copy text={licenseUrl(n.code)} label="Copy link" />
    </div>
  </div>
);

const Scope = ({ g }: { g: Grant }) => {
  const r = indexes(g.regions).map((i) => REGIONS[i]);
  const c = indexes(g.categories).map((i) => CATEGORIES[i]);
  return (
    <span>
      {r.join(", ")} <span className="muted">×</span> {c.join(", ")}
    </span>
  );
};

const GrantRow = ({ id, g, n, accepted }: { id: number; g: Grant; n?: { name: string; note: string; code: string }; accepted: boolean }) => (
  <div className="grant-row">
    <span className="swatch" style={{ background: g.exclusive ? tone(id) : `repeating-linear-gradient(135deg, ${tone(id)} 0 3px, transparent 3px 7px)` }} />
    <span className="num">#{id + 1}</span>
    <span className="who">
      <b>{n?.name ?? short(toHex(g.licensee))}</b>
      <Scope g={g} />
      <span className="muted">
        {period(g.start, g.end)} · {g.exclusive ? "exclusive" : "non-exclusive"}
        {n?.note ? ` · ${n.note}` : ""}
      </span>
    </span>
    <span className={`state ${accepted ? "ok" : ""}`}>{accepted ? "Accepted" : "Not accepted yet"}</span>
    {n?.code && <Copy text={licenseUrl(n.code)} label="License link" />}
  </div>
);

// ── everyone else ───────────────────────────────────────────────────────────
const PublicView = ({ address, l }: { address: string; l: Ledger }) => {
  const [region, setRegion] = useState(0);
  const [category, setCategory] = useState(0);
  const grants = [...l.grants].sort(([a], [b]) => Number(a - b));
  return (
    <main className="book">
      <BookHead l={l} address={address} role="Book" />
      <div className="book-grid">
        <section className="map-side">
          <div className="sealed">
            <RightsMap disabled />
            <div className="seal">
              <b>Private book</b>
              <span>{Number(l.issued)} grants issued. Who holds them, where and on what terms is known only to the licensor and each licensee.</span>
            </div>
          </div>
        </section>
        <aside className="issue">
          <h2>Check a license</h2>
          <p className="muted">Ask a licensee to prove they hold rights here today. They prove it without showing the rest of their deal.</p>
          <div className="field two">
            <select value={region} onChange={(e) => setRegion(Number(e.target.value))}>
              {REGIONS.map((r, i) => (
                <option key={r} value={i}>
                  {r}
                </option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(Number(e.target.value))}>
              {CATEGORIES.map((c, i) => (
                <option key={c} value={i}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button className="btn primary" onClick={() => go(`/c/${address}/${region}/${category}/${toHex(randomBytes())}`)}>
            Create check
          </button>
        </aside>
      </div>
      <section className="grants">
        <h2>On the ledger</h2>
        {grants.length === 0 && <p className="muted">No grants yet.</p>}
        {grants.map(([id, c]) => (
          <div key={String(id)} className="grant-row">
            <span className="num">#{Number(id) + 1}</span>
            <span className="who mono">{toHex(c)}</span>
            <span className={`state ${l.accepted.member(id) ? "ok" : ""}`}>{l.accepted.member(id) ? "Accepted" : "Not accepted yet"}</span>
          </div>
        ))}
      </section>
    </main>
  );
};

const BookHead = ({ l, address, role }: { l: Ledger; address: string; role: string }) => {
  const [clean, setClean] = useState<boolean | null>(null);
  useEffect(() => {
    fetchDeployLedger(address)
      .then((d) => setClean(d ? startedClean(d) : false))
      .catch(() => setClean(null));
  }, [address]);
  return (
    <header className="book-head">
      <div>
        <span className="eyebrow">{role}</span>
        <h1>{l.title}</h1>
      </div>
      <span className="grow" />
      <div className="facts">
        <span>
          <b>{Number(l.issued)}</b> issued
        </span>
        <span>
          <b>{Number(l.accepted.size())}</b> accepted
        </span>
        <span>
          <b>{Number(l.checks.size())}</b> checks
        </span>
        {clean !== null && (
          <span className={`clean ${clean ? "ok" : "bad"}`} title="The deploy transaction is not proven, so Carve checks the book started empty. Every change since was proven.">
            {clean ? "✓ Started clean" : "✕ Tampered at deploy"}
          </span>
        )}
        <Copy text={location.href} label="Copy link" />
      </div>
    </header>
  );
};
