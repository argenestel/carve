// SPDX-License-Identifier: Apache-2.0
import { useState } from "react";
import { go } from "../App";
import { isAddress, recentGames } from "../lib/game";
import { Board, type Mark } from "./Board";

const parseGame = (s: string) => {
  const m = s.trim().match(/([0-9a-fA-F]{64})/);
  return m && isAddress(m[1]) ? m[1] : null;
};

// The illustration: a fleet mid-game.
const ART_SHIPS = [
  { x: 1, y: 1, vertical: false },
  { x: 6, y: 2, vertical: true },
  { x: 1, y: 4, vertical: true },
  { x: 3, y: 6, vertical: false },
];
const ART_MARKS: Record<string, Mark> = {
  "11": "hit",
  "21": "hit",
  "62": "hit",
  "05": "miss",
  "43": "miss",
  "70": "miss",
  "36": "hit",
  "57": "miss",
  "44": "incoming",
  "15": "incoming",
};

export const Home = () => {
  const [link, setLink] = useState("");
  const recent = recentGames();
  const target = parseGame(link);

  return (
    <main className="home">
      <div className="hero-grid">
        <section className="hero">
          <h1>
            Hidden fleets.
            <br />
            <em>Proven hits.</em>
          </h1>
          <p>
            Battleship on Midnight. Your ships never leave your device, and every hit or miss is checked by a zero-knowledge proof. No server, no referee, and
            no way to cheat.
          </p>
          <div className="hero-actions">
            <button className="btn primary big" onClick={() => go("/new")}>
              New game
            </button>
            <form
              className="join-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (target) go(`/g/${target}`);
              }}
            >
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a game link" spellCheck={false} />
              <button className="btn" disabled={!target}>
                Join
              </button>
            </form>
          </div>
        </section>
        <div className="hero-art" aria-hidden>
          <Board ships={ART_SHIPS} mark={(x, y) => ART_MARKS[`${x}${y}`] ?? null} />
        </div>
      </div>

      <ol className="how">
        <li>
          <b>Hide</b> Place four ships. Only a hash goes on-chain, with a proof the fleet is legal.
        </li>
        <li>
          <b>Fire</b> Three shots a turn. Your opponent must answer with a proof, so they can't lie about a hit.
        </li>
        <li>
          <b>Sink</b> First to hit all 12 cells wins. Stall too long and you lose on time.
        </li>
      </ol>

      {recent.length > 0 && (
        <section className="recent">
          <h2>Your games</h2>
          {recent.map((r) => (
            <a key={r.address} href={`#/g/${r.address}`}>
              <span className="mono">
                {r.address.slice(0, 10)}…{r.address.slice(-6)}
              </span>
              <span className="muted">{new Date(r.at).toLocaleDateString()}</span>
            </a>
          ))}
        </section>
      )}
    </main>
  );
};
