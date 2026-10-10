// SPDX-License-Identifier: Apache-2.0
import { type BidlockPrivateState, type Ledger, pureCircuits, toHex } from "@bidlock/contract";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "../App";
import {
  type Providers,
  type TxResult,
  acceptAward,
  award,
  decryptOpenings,
  disputeAward,
  ensureCredential,
  canRead,
  fetchLedger,
  isAddress,
  onReaderChange,
  joinTender,
  loadPrivateState,
  makeProviders,
  myBid,
  placeBid,
  qualify,
  rememberTender,
  revealBid,
  watchLedger,
} from "../lib/tender";
import { Busy, Copy, countdown, errorText, eur, useNow } from "./ui";

type Phase = "bidding" | "reveal" | "evaluation" | "awarded";
const PHASES: { id: Phase; label: string }[] = [
  { id: "bidding", label: "Bid" },
  { id: "reveal", label: "Reveal" },
  { id: "evaluation", label: "Evaluate" },
  { id: "awarded", label: "Award" },
];

const phaseOf = (l: Ledger, now: number): Phase => {
  const t = BigInt(Math.floor(now / 1000));
  return l.awarded ? "awarded" : t < l.closes_at ? "bidding" : t < l.reveal_until ? "reveal" : "evaluation";
};
const ms = (t: bigint) => Number(t) * 1000;
const when = (t: bigint) => new Date(ms(t)).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const TenderPage = ({ address, query }: { address: string; query: URLSearchParams }) => {
  const { connect } = useWallet();
  const now = useNow();
  const [l, setL] = useState<Ledger | null | undefined>(undefined);
  const [ps, setPs] = useState<BidlockPrivateState | null>(null);
  const [publicView, setPublicView] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<TxResult | null>(null);
  const contract = useRef<{ p: Providers; c: unknown } | null>(null);

  const refresh = useCallback(async () => {
    setPs(await loadPrivateState(address));
    if (canRead()) setL(await fetchLedger(address).catch(() => null));
  }, [address]);

  const validAddress = isAddress(address);
  const [readable, setReadable] = useState(canRead());
  useEffect(() => onReaderChange(() => setReadable(canRead())), []);

  useEffect(() => {
    if (!validAddress || !readable) return;
    contract.current = null;
    void refresh();
    const sub = watchLedger(address).subscribe({ next: setL, error: () => {} });
    return () => sub.unsubscribe();
  }, [address, refresh, validAddress, readable]);

  useEffect(() => {
    if (l) rememberTender({ address, title: l.title, role: ps?.buyerSecret ? "buyer" : ps?.supplierSecret ? "supplier" : "viewer" });
  }, [l?.title, ps, address]);

  /** Run a transaction: connect, join once, prove in Lace, submit, refresh. */
  const run = async (label: string, fn: (c: never) => Promise<TxResult | { txId: string; block: number }>) => {
    setErr(null);
    try {
      setBusy("Connecting to Lace");
      if (!contract.current) {
        const w = await connect();
        setBusy("Joining tender");
        const p = await makeProviders(w);
        contract.current = { p, c: await joinTender(p, address) };
      }
      setBusy(label);
      setLastTx(await fn(contract.current.c as never));
      await refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (!validAddress)
    return (
      <main className="center">
        <h1>Not an address.</h1>
        <p className="big">Tender addresses are 64 hex characters.</p>
      </main>
    );
  if (!readable)
    return (
      <main className="center">
        <h1>Connect to view.</h1>
        <p className="big">This tender is read from Midnight Preprod through your Lace wallet.</p>
        <button className="cta" onClick={() => connect().catch(() => {})}>
          Connect Lace
        </button>
      </main>
    );
  if (l === undefined) return <main className="center"><Busy label="Loading tender from Preprod" /></main>;
  if (l === null)
    return (
      <main className="center">
        <h1>Not found.</h1>
        <p className="big">No Bidlock tender at this address on Preprod.</p>
      </main>
    );

  const phase = phaseOf(l, now);
  const role = ps?.buyerSecret ? "buyer" : ps?.supplierSecret ? "supplier" : "viewer";
  const deadline = phase === "bidding" ? l.closes_at : phase === "reveal" ? l.reveal_until : null;
  const ctx = { l, ps, address, phase, busy, run, query, refresh };

  return (
    <>
      <section className="tender-head">
        <div>
          <span className="tender-label">Tender · {role === "buyer" ? "you are the buyer" : role === "supplier" ? "you are a supplier" : "viewing"}</span>
          <h2 className="tender-title">{l.title}</h2>
          <div className="tender">
            <span className="pill">Ceiling {eur(l.ceiling)}</span>
            <span className="pill">{String(l.supplier_count)} qualified</span>
            <span className="pill">{String(l.bid_count)} bids</span>
          </div>
        </div>
        <button className={`switch ${publicView ? "on" : ""}`} onClick={() => setPublicView(!publicView)} aria-pressed={publicView}>
          <span className="knob" />
          {publicView ? "Public view" : "Your view"}
        </button>
      </section>

      <ol className="rail">
        {PHASES.map((p, i) => {
          const at = PHASES.findIndex((x) => x.id === phase);
          const sub = p.id === "bidding" ? `closes ${when(l.closes_at)}` : p.id === "reveal" ? `until ${when(l.reveal_until)}` : "";
          return (
            <li key={p.id} className={i < at ? "done" : i === at ? "now" : ""}>
              <span className="rail-n">0{i + 1}</span>
              <span className="rail-l">{p.label}</span>
              <span className="rail-sub">{i === at && deadline ? countdown(ms(deadline), now) : sub}</span>
            </li>
          );
        })}
      </ol>

      <main className="stage">
        <section className="panel">
          {role === "buyer" ? <BuyerPanel {...ctx} /> : <SupplierPanel {...ctx} />}
          {err && <p className="warn">{err}</p>}
          {lastTx && !busy && (
            <p className="fine">
              Confirmed in block {lastTx.block} · tx <code>{lastTx.txId.slice(0, 16)}…</code>
            </p>
          )}
        </section>
        <section className="wall">
          <Wall l={l} ps={ps} address={address} publicView={publicView} buyer={role === "buyer"} />
        </section>
      </main>

      <footer className="facts">
        <span className="label">Contract</span> <code>{address}</code> <Copy text={address} />
        <Copy text={`${location.origin}${location.pathname}#/t/${address}`} label="Copy share link" />
      </footer>
    </>
  );
};

type PanelProps = {
  l: Ledger;
  ps: BidlockPrivateState | null;
  address: string;
  phase: Phase;
  busy: string | null;
  run: (label: string, fn: (c: never) => Promise<TxResult>) => Promise<void>;
  query: URLSearchParams;
  refresh: () => Promise<void>;
};

// ── buyer ───────────────────────────────────────────────────────────────────

const BuyerPanel = ({ l, address, phase, busy, run, query }: PanelProps) => {
  const [commitment, setCommitment] = useState(query.get("qualify") ?? "");
  const [exclude, setExclude] = useState<bigint[]>([]);
  const openings = decryptOpenings(address, l);
  const valid = /^[0-9a-fA-F]{64}$/.test(commitment.trim());
  const already = valid && l.qualified.member(Uint8Array.from(commitment.trim().match(/../g)!.map((h) => parseInt(h, 16))));

  if (phase === "bidding")
    return (
      <>
        <h1>Qualify suppliers.</h1>
        <p className="big">Suppliers send you a request link. Open it, or paste their code here.</p>
        <div className="row">
          <input className="field mono" placeholder="Supplier code (64 hex)" value={commitment} onChange={(e) => setCommitment(e.target.value)} />
          <button
            className="cta"
            disabled={!valid || already || !!busy}
            onClick={() => run("Proving & approving in Lace", (c) => qualify(c, commitment.trim())).then(() => setCommitment(""))}
          >
            {busy ? <Busy label={busy} /> : already ? "Qualified" : "Qualify"}
          </button>
        </div>
        <p className="fine">You won't learn which qualified supplier placed which bid.</p>
      </>
    );

  const list = (
    <ul className="openings">
      {[...openings].sort(([, a], [, b]) => (a.opening.amount < b.opening.amount ? -1 : 1)).map(([i, o]) => (
        <li key={String(i)}>
          {phase === "evaluation" && (
            <input
              type="checkbox"
              checked={!exclude.includes(i)}
              onChange={(e) => setExclude(e.target.checked ? exclude.filter((x) => x !== i) : [...exclude, i])}
              title="Count this bid"
            />
          )}
          <span className="env-n">#{String(i)}</span>
          <strong>{eur(o.opening.amount)}</strong>
          <span className="muted">{o.company}</span>
        </li>
      ))}
    </ul>
  );

  if (phase === "reveal")
    return (
      <>
        <h1>Bids opening.</h1>
        <p className="big">
          {openings.size} of {String(l.bid_count)} revealed to you. Only your browser can read them.
        </p>
        {list}
      </>
    );

  if (phase === "evaluation") {
    const counted = [...openings].filter(([i]) => !exclude.includes(i));
    const best = counted.sort(([, a], [, b]) => (a.opening.amount < b.opening.amount ? -1 : 1))[0];
    return (
      <>
        <h1>Award.</h1>
        <p className="big">You'll prove the winner is the lowest bid you count. Leaving a bid out is public and can be disputed.</p>
        {list}
        <button className="cta" disabled={!best || !!busy} onClick={() => run("Proving the award in Lace", (c) => award(address, l, c, exclude))}>
          {busy ? <Busy label={busy} /> : best ? `Award #${best[0]} at ${eur(best[1].opening.amount)}` : "No bids to award"}
        </button>
      </>
    );
  }

  return <Result l={l} />;
};

// ── supplier / visitor ──────────────────────────────────────────────────────

const SupplierPanel = ({ l, ps, address, phase, busy, run, refresh }: PanelProps) => {
  const [price, setPrice] = useState("");
  const [company, setCompany] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const bid = myBid(ps);

  useEffect(() => {
    if (ps?.supplierSecret) setCode(toHex(pureCircuits.supplier_commitment(ps.supplierSecret)));
  }, [ps]);

  const qualified = code ? l.qualified.member(Uint8Array.from(code.match(/../g)!.map((h) => parseInt(h, 16)))) : false;
  const requestLink = code ? `${location.origin}${location.pathname}#/t/${address}?qualify=${code}` : "";

  if (phase === "bidding" && !bid) {
    if (!code)
      return (
        <>
          <h1>Want to bid?</h1>
          <p className="big">Get a supplier code for this tender and send it to the buyer.</p>
          <button
            className="cta"
            onClick={async () => {
              setCode(await ensureCredential(address));
              await refresh();
            }}
          >
            Request to bid
          </button>
          <p className="fine">The code is a hash. Your secret stays in this browser.</p>
        </>
      );
    if (!qualified)
      return (
        <>
          <h1>Waiting for the buyer.</h1>
          <p className="big">Send the buyer this link. This page updates as soon as you're qualified.</p>
          <div className="share">
            <code>{requestLink}</code>
            <Copy text={requestLink} label="Copy link" />
          </div>
        </>
      );
    const amount = BigInt(price.replace(/\D/g, "") || "0");
    const tooHigh = amount > l.ceiling;
    return (
      <>
        <h1>Your price</h1>
        <label className="price">
          <span>€</span>
          <input inputMode="numeric" placeholder="0" value={amount ? Number(amount).toLocaleString("en-GB") : ""} onChange={(e) => setPrice(e.target.value)} disabled={!!busy} />
        </label>
        {tooHigh && <p className="warn">Above the {eur(l.ceiling)} ceiling.</p>}
        <button className="cta" disabled={!!busy || amount === 0n || tooHigh} onClick={() => run("Proving & sealing in Lace", (c) => placeBid(address, c, amount))}>
          {busy ? <Busy label={busy} /> : "Seal bid"}
        </button>
        <p className="fine">Nobody sees this number until you reveal it. Not even the buyer.</p>
      </>
    );
  }

  if (phase === "bidding")
    return (
      <>
        <h1>Sealed.</h1>
        <p className="big">Bid #{String(bid![0])} at {eur(bid![1].amount)}. Only this browser knows the price.</p>
      </>
    );

  if (!bid)
    return phase === "awarded" ? (
      <Result l={l} />
    ) : (
      <>
        <h1>Bidding closed.</h1>
        <p className="big">{String(l.bid_count)} sealed bids. You're watching as the public sees it.</p>
      </>
    );

  if (phase === "reveal") {
    const revealed = l.sealed_openings.member(bid[0]);
    return revealed ? (
      <>
        <h1>Opened for the buyer.</h1>
        <p className="big">Only the buyer's key can read your price.</p>
      </>
    ) : (
      <>
        <h1>Reveal to the buyer.</h1>
        <p className="big">Sealed to the buyer's key. Unrevealed bids can't win.</p>
        <input className="field" placeholder="Company name (only the buyer sees this)" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button className="cta" disabled={!company.trim() || !!busy} onClick={() => run("Proving & approving in Lace", (c) => revealBid(l, c, ps!, company.trim()))}>
          {busy ? <Busy label={busy} /> : "Reveal to buyer"}
        </button>
      </>
    );
  }

  if (phase === "evaluation")
    return (
      <>
        <h1>The buyer decides.</h1>
        <p className="big">They must prove the award goes to the lowest bid they count.</p>
      </>
    );

  const won = l.winner === bid[0];
  const excluded = l.included.member(bid[0]) && !l.included.lookup(bid[0]);
  const canDispute = excluded && l.sealed_openings.member(bid[0]) && !l.disputed.member(bid[0]) && bid[1].amount < l.winning_amount;
  if (won && !l.accepted)
    return (
      <>
        <h1>You won.</h1>
        <p className="big">At {eur(l.winning_amount)}. Step forward by name to take the contract.</p>
        <input className="field" placeholder="Company name (public)" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button className="cta" disabled={!company.trim() || !!busy} onClick={() => run("Proving in Lace", (c) => acceptAward(c, company.trim()))}>
          {busy ? <Busy label={busy} /> : "Claim the contract"}
        </button>
      </>
    );
  if (canDispute)
    return (
      <>
        <h1>You were cut.</h1>
        <p className="big">
          Your {eur(bid[1].amount)} beat the winning {eur(l.winning_amount)}, but the buyer left it out. Disputing makes your price public.
        </p>
        <button className="cta danger" disabled={!!busy} onClick={() => run("Proving in Lace", (c) => disputeAward(c, ps!))}>
          {busy ? <Busy label={busy} /> : "Prove it & dispute"}
        </button>
      </>
    );
  return <Result l={l} mine={bid[0]} />;
};

const Result = ({ l, mine }: { l: Ledger; mine?: bigint }) => (
  <>
    {l.contested && <div className="stamp">Contested</div>}
    <h1>{mine !== undefined && l.winner === mine ? "You won." : l.contested ? "Contested." : "Awarded."}</h1>
    <p className="big">
      Bid #{String(l.winner)} at {eur(l.winning_amount)}
      {l.accepted ? `, ${l.winner_name}` : ""}.{" "}
      {l.contested ? `${String(l.disputes)} excluded bidder(s) proved they were cheaper.` : "Every losing price stays sealed."}
    </p>
  </>
);

// ── envelopes ──────────────────────────────────────────────────────────────

const Wall = ({ l, ps, address, publicView, buyer }: { l: Ledger; ps: BidlockPrivateState | null; address: string; publicView: boolean; buyer: boolean }) => {
  const bid = myBid(ps);
  const opened = buyer ? decryptOpenings(address, l) : new Map();
  const n = Number(l.bid_count);
  const slots = Array.from({ length: Math.max(4, Math.min(8, n + (n % 2))) }, (_, i) => BigInt(i));
  return (
    <div className="envelopes">
      {slots.map((i) => {
        if (i >= l.bid_count) return <div key={String(i)} className="env empty" />;
        const isMine = bid?.[0] === i;
        const won = l.awarded && l.winner === i;
        const excluded = l.awarded && l.included.member(i) && !l.included.lookup(i);
        const disputedAmt = l.disputed.member(i) ? l.disputed.lookup(i) : null;
        const revealed = l.sealed_openings.member(i);
        const open = won || disputedAmt !== null;
        const privately = !publicView && (isMine ? bid![1].amount : opened.get(i)?.opening.amount);
        return (
          <article key={String(i)} className={`env ${open ? "open" : ""} ${isMine && !publicView ? "mine" : ""} ${excluded ? "excluded" : ""}`}>
            <header>
              <span className="env-n">#{String(i)}</span>
              {isMine && !publicView && <span className="tag-you">You</span>}
              {revealed && !open && <span className="tag">to buyer</span>}
            </header>
            {open ? (
              <div className="env-body">
                <div className="amount">{eur(won ? l.winning_amount : disputedAmt!)}</div>
                <div className="who">{won ? (l.accepted ? l.winner_name : "Winner") : "Disputed, price made public"}</div>
              </div>
            ) : publicView ? (
              <div className="env-body">
                <code className="commit">{toHex(l.bids.lookup(i)).match(/.{1,16}/g)!.join("\n")}</code>
                <div className="who">commitment</div>
              </div>
            ) : (
              <div className="env-body">
                <div className="seal" aria-hidden>
                  <svg viewBox="0 0 40 40">
                    <path d="M14 18v-4a6 6 0 0 1 12 0v4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <rect x="10" y="18" width="20" height="14" rx="3" fill="currentColor" />
                  </svg>
                </div>
                <div className="who">{privately ? `${eur(privately)}${isMine ? "" : " · only you see this"}` : l.awarded ? "Sealed forever" : "Sealed"}</div>
              </div>
            )}
            {excluded && <footer className="cut">Excluded by buyer</footer>}
          </article>
        );
      })}
    </div>
  );
};
