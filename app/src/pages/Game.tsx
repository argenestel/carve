// SPDX-License-Identifier: Apache-2.0
import {
  FLEET_CELLS,
  type Ledger,
  Phase,
  type Placement,
  SALVO,
  type SalvoPrivateState,
  fromShips,
  newPlayer,
  randomPlacement,
  toFleet,
} from "@salvo/contract";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "../App";
import {
  canRead,
  claimTimeout,
  fetchLedger,
  fire,
  isAddress,
  loadPrivateState,
  makeProviders,
  onReaderChange,
  openGame,
  rememberGame,
  resign,
  seatOf,
  showFleet,
  takeSeat,
  watchLedger,
} from "../lib/game";
import { local } from "../lib/privateState";
import { Board, type Mark, coord } from "./Board";
import { FleetEditor } from "./FleetEditor";
import { Busy, Copy, countdown, errorText, useNow } from "./ui";

type Shots = Ledger["shots_at1"];
type XY = [number, number];
const idx = (x: number, y: number) => BigInt(y * 8 + x);
const result = (s: Shots, x: number, y: number): Mark => (s.member(idx(x, y)) ? (s.lookup(idx(x, y)) ? "hit" : "miss") : null);
const perMove = (s: bigint) => (s >= 86400n ? `${s / 86400n} day` : s >= 3600n ? `${s / 3600n} hour` : `${s / 60n} min`);
const has = (list: XY[], x: number, y: number) => list.some(([a, b]) => a === x && b === y);

export const GamePage = ({ address }: { address: string }) => {
  const { connect } = useWallet();
  const now = useNow();
  const [readable, setReadable] = useState(canRead());
  const [l, setL] = useState<Ledger | null | undefined>(undefined);
  const [ps, setPs] = useState<SalvoPrivateState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<XY[]>([]);
  const [draft, setDraft] = useState<Placement[]>(randomPlacement);
  // biome-ignore lint/suspicious/noExplicitAny: the deployed-contract handle from midnight-js
  const contract = useRef<any>(null);
  const valid = isAddress(address);

  useEffect(() => onReaderChange(() => setReadable(canRead())), []);
  useEffect(() => {
    if (valid) loadPrivateState(address).then(setPs);
  }, [address, valid]);
  useEffect(() => {
    if (!readable || !valid) return;
    let alive = true;
    fetchLedger(address)
      .then((x) => alive && setL(x))
      .catch((e) => alive && setError(errorText(e)));
    const sub = watchLedger(address).subscribe({ next: (x) => alive && setL(x), error: () => {} });
    return () => {
      alive = false;
      sub.unsubscribe();
    };
  }, [address, readable, valid]);

  const run = async (label: string, fn: (c: unknown) => Promise<unknown>, fresh?: SalvoPrivateState) => {
    setError(null);
    setBusy(label);
    try {
      const w = await connect();
      if (!contract.current || fresh) contract.current = await openGame(await makeProviders(w), address, fresh);
      await fn(contract.current);
      rememberGame(address);
      setPs(await loadPrivateState(address));
      setL(await fetchLedger(address));
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (!valid) return <Notice title="That isn't a game address" />;
  if (!readable)
    return (
      <Notice title="Connect Lace to load this game">
        <button className="btn primary" onClick={() => connect().catch(() => {})}>
          Connect Lace
        </button>
      </Notice>
    );
  if (l === undefined) return <Notice title={<Busy label="Loading the game" />} />;
  if (l === null) return <Notice title="No game at this address on Preprod" />;

  const seat = seatOf(l, ps);
  const mine = ps?.fleet ? fromShips(ps.fleet.ships) : null;
  const err = error && <p className="error">{error}</p>;

  // ── setting up ────────────────────────────────────────────────────────────
  if (l.phase === Phase.empty)
    return ps?.fleet ? (
      <Panel title="Finish creating your game" board={<Board ships={mine!} />}>
        <p className="muted">The game is deployed. Commit your fleet to open it to an opponent.</p>
        <button className="btn primary big" disabled={!!busy} onClick={() => run("Committing your fleet", takeSeat)}>
          {busy ? <Busy label={busy} /> : "Commit fleet"}
        </button>
        {err}
      </Panel>
    ) : (
      <Notice title="Waiting for the creator to commit their fleet" />
    );

  if (l.phase === Phase.open)
    return seat === 1 ? (
      <Panel title="Waiting for an opponent" board={<Board ships={mine!} />}>
        <p className="muted">Send them this link. The game starts when they commit their fleet.</p>
        <div className="share">
          <span className="mono">{location.href}</span>
          <Copy text={location.href} label="Copy link" />
        </div>
        <p className="fine">You fire first. {perMove(l.move_time)} per move.</p>
      </Panel>
    ) : (
      <Panel title="You've been challenged" board={<FleetEditor ships={draft} onChange={setDraft} disabled={!!busy} />}>
        <p className="muted">Place your fleet. Only its hash goes on-chain, along with a proof that it's legal.</p>
        <p className="fine gap">{perMove(l.move_time)} per move. Your opponent fires first.</p>
        <button className="btn primary big" disabled={!!busy} onClick={() => run("Proving your fleet and joining", takeSeat, newPlayer(toFleet(draft)))}>
          {busy ? <Busy label={busy} /> : "Join game"}
        </button>
        {err}
      </Panel>
    );

  // ── playing / over ────────────────────────────────────────────────────────
  const playing = l.phase === Phase.playing;
  const turn = Number(l.turn) as 1 | 2;
  const incoming: XY[] = l.incoming.slice(0, Number(l.incoming_count)).map((s) => [Number(s.x), Number(s.y)]);
  const deadline = Number(l.deadline) * 1000;
  const late = now >= deadline;

  if (!seat) return <Spectator l={l} incoming={incoming} turn={turn} late={late} left={countdown(deadline, now)} />;

  const opp = seat === 1 ? 2 : 1;
  const atMe = seat === 1 ? l.shots_at1 : l.shots_at2;
  const atThem = seat === 1 ? l.shots_at2 : l.shots_at1;
  const hitsOnMe = Number(seat === 1 ? l.hits_on1 : l.hits_on2);
  const hitsOnThem = Number(seat === 1 ? l.hits_on2 : l.hits_on1);
  const myTurn = playing && turn === seat;
  const theirShown = opp === 1 ? (l.is_shown1 ? fromShips(l.shown1) : null) : l.is_shown2 ? fromShips(l.shown2) : null;
  const iShowed = seat === 1 ? l.is_shown1 : l.is_shown2;
  const won = Number(l.winner) === seat;

  const last = local.get<XY[]>(`last:${address}`) ?? [];
  const lastAnswered = myTurn ? last.filter(([x, y]) => result(atThem, x, y)) : [];

  const aim = (x: number, y: number) => {
    if (!myTurn || busy || result(atThem, x, y)) return;
    setTargets((t) => (has(t, x, y) ? t.filter(([a, b]) => a !== x || b !== y) : [...t, [x, y] as XY].slice(-SALVO)));
  };
  const doFire = async () => {
    const shots = targets;
    if (await run(incoming.length ? "Proving your answers and firing" : "Firing", (c) => fire(c, shots))) {
      local.set(`last:${address}`, shots);
      setTargets([]);
    }
  };

  return (
    <main className="game">
      <header className={`status ${myTurn ? "go" : ""} ${!playing ? (won ? "won" : "lost") : ""}`}>
        {playing ? (
          myTurn ? (
            <>
              <b>Your move</b>
              <span className={late ? "warn" : ""}>{late ? "Out of time. Move now before they claim" : `${countdown(deadline, now)} left`}</span>
            </>
          ) : (
            <>
              <b>Their move</b>
              <span>{late ? "They ran out of time" : `${countdown(deadline, now)} left`}</span>
            </>
          )
        ) : (
          <>
            <b>{won ? "Victory" : "Defeat"}</b>
            <span>
              {l.by_timeout
                ? won
                  ? "They ran out of time"
                  : "You ran out of time"
                : (won ? hitsOnThem : hitsOnMe) >= FLEET_CELLS
                  ? won
                    ? "You sank their fleet"
                    : "Your fleet was sunk"
                  : won
                    ? "They resigned"
                    : "You resigned"}
            </span>
          </>
        )}
        <span className="grow" />
        <Score label="You" hits={hitsOnThem} />
        <Score label="Them" hits={hitsOnMe} />
      </header>

      <div className="boards">
        <section>
          <h2>Your fleet</h2>
          <Board ships={mine ?? []} mark={(x, y) => result(atMe, x, y) ?? (myTurn && has(incoming, x, y) ? "incoming" : null)} />
          <p className="caption">
            {myTurn && incoming.length > 0
              ? `${incoming.length} incoming at ${incoming.map(([x, y]) => coord(x, y)).join(", ")}. Firing proves your answers.`
              : " "}
          </p>
        </section>

        <section className="enemy">
          <h2>Enemy waters</h2>
          <Board
            ships={theirShown ?? []}
            ghost
            dim={!myTurn && playing}
            disabled={!myTurn || !!busy}
            onCell={aim}
            mark={(x, y) => result(atThem, x, y) ?? (!myTurn && playing && has(incoming, x, y) ? "pending" : has(targets, x, y) ? "target" : null)}
            label={(x, y) => {
              const i = targets.findIndex(([a, b]) => a === x && b === y);
              return i >= 0 ? <span className="tnum">{i + 1}</span> : null;
            }}
          />
          {myTurn ? (
            <div className="fire-bar">
              <span className="slots">
                {Array.from({ length: SALVO }, (_, i) => (
                  <span key={i} className={`slot ${targets[i] ? "on" : ""}`}>
                    {targets[i] ? coord(...targets[i]) : "·"}
                  </span>
                ))}
              </span>
              <button className="btn primary" disabled={!targets.length || !!busy} onClick={doFire}>
                {busy ? <Busy label={busy} /> : `Fire ${targets.length || ""}`}
              </button>
            </div>
          ) : (
            <p className="caption">{playing ? `Your shots at ${incoming.map(([x, y]) => coord(x, y)).join(", ")} wait for their proof.` : " "}</p>
          )}
          {lastAnswered.length > 0 && (
            <p className="caption">
              Last salvo:{" "}
              {lastAnswered.map(([x, y]) => (
                <span key={`${x}${y}`} className={`tag ${result(atThem, x, y)}`}>
                  {coord(x, y)} {result(atThem, x, y)}
                </span>
              ))}
            </p>
          )}
        </section>
      </div>

      {err}

      <footer className="game-foot">
        {playing && !myTurn && late && (
          <button className="btn primary" disabled={!!busy} onClick={() => run("Claiming the win", claimTimeout)}>
            {busy ? <Busy label={busy} /> : "Claim the win"}
          </button>
        )}
        {!playing && !iShowed && mine && (
          <button className="btn" disabled={!!busy} onClick={() => run("Revealing your fleet", showFleet)}>
            {busy ? <Busy label={busy} /> : "Show my fleet to them"}
          </button>
        )}
        <span className="grow" />
        <Copy text={location.href} label="Copy link" />
        {playing && (
          <button className="ghost-btn" disabled={!!busy} onClick={() => run("Resigning", resign)}>
            Resign
          </button>
        )}
        <span className="mono muted">{address.slice(0, 8)}…</span>
      </footer>
    </main>
  );
};

const Score = ({ label, hits }: { label: string; hits: number }) => (
  <span className="score" title={`${hits} of ${FLEET_CELLS} hit`}>
    <span className="score-label">{label}</span>
    <span className="pips">
      {Array.from({ length: FLEET_CELLS }, (_, i) => (
        <i key={i} className={i < hits ? "on" : ""} />
      ))}
    </span>
  </span>
);

const Spectator = ({ l, incoming, turn, late, left }: { l: Ledger; incoming: XY[]; turn: 1 | 2; late: boolean; left: string }) => {
  const playing = l.phase === Phase.playing;
  const side = (n: 1 | 2) => {
    const shots = n === 1 ? l.shots_at1 : l.shots_at2;
    const shown = n === 1 ? (l.is_shown1 ? fromShips(l.shown1) : null) : l.is_shown2 ? fromShips(l.shown2) : null;
    return (
      <section>
        <h2>
          Fleet {n}
          {!playing && Number(l.winner) === n && <span className="crown"> · winner</span>}
        </h2>
        <Board ships={shown ?? []} ghost mark={(x, y) => result(shots, x, y) ?? (playing && turn === n && has(incoming, x, y) ? "pending" : null)} />
      </section>
    );
  };
  return (
    <main className="game">
      <header className="status">
        <b>{playing ? `Player ${turn} to move` : `Player ${l.winner} won`}</b>
        <span>
          {playing
            ? late
              ? "Out of time"
              : `${left} left`
            : l.by_timeout
              ? "on time"
              : l.hits_on1 >= 12n || l.hits_on2 >= 12n
                ? "fleet sunk"
                : "by resignation"}
        </span>
        <span className="grow" />
        <Score label="P1" hits={Number(l.hits_on2)} />
        <Score label="P2" hits={Number(l.hits_on1)} />
      </header>
      <div className="boards">
        {side(1)}
        {side(2)}
      </div>
      <p className="caption center">You're watching. Every mark is an answer proven against a hidden fleet.</p>
    </main>
  );
};

const Notice = ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
  <main className="notice">
    <h1>{title}</h1>
    {children}
  </main>
);

const Panel = ({ title, board, children }: { title: string; board: React.ReactNode; children: React.ReactNode }) => (
  <main className="setup">
    <div className="setup-board">{board}</div>
    <aside className="setup-side">
      <h1>{title}</h1>
      {children}
    </aside>
  </main>
);
