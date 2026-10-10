#!/usr/bin/env -S node --import tsx
// SPDX-License-Identifier: Apache-2.0
//
// salvo: play Battleship on a Midnight network from the terminal.
//
//   npm run salvo -- <command> [args] [--net preprod] [--as <player>]
//
// Players are local private-state namespaces ("me" by default). One wallet
// pays fees for all of them in this CLI.

import { BOARD, type Ledger, Phase, type Placement, fleetProblem, fromShips, isHitAt, randomPlacement } from "@salvo/contract";
import { loadNetwork } from "./config.js";
import * as S from "./salvo.js";
import { buildWallet, loadOrCreateSeed, persistWallet, step } from "./wallet.js";

const HELP = `
salvo: Battleship on Midnight

  new [minutesPerMove=60]   Deploy a game and commit your fleet
  join <address>            Commit your fleet and join a game
  fire A1 [B2] [C3]         Answer the salvo at you (with proofs) and fire back
  board                     Both boards and whose turn it is
  claim                     Win if your opponent ran out of time
  resign                    Give up
  show                      After the game, reveal your fleet

Options: --net preprod|preview|undeployed (default preprod)  --as <player>  --game <address>
         --fleet "A1h B3h C5v F2v"   ships of length 4,3,3,2: top-left cell + h|v (random if omitted)
`;

const parseArgs = (argv: string[]) => {
  const flags: Record<string, string> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { cmd: pos[0], args: pos.slice(1), flags };
};

const COLS = "ABCDEFGH";
const parseCell = (s: string): [number, number] => {
  const m = s.toUpperCase().match(/^([A-H])([1-8])$/);
  if (!m) throw new Error(`"${s}" is not a cell (A1 to H8)`);
  return [COLS.indexOf(m[1]), Number(m[2]) - 1];
};
const parseFleet = (s: string | undefined): Placement[] => {
  if (!s) return randomPlacement();
  const ships = s.trim().split(/\s+/).map((t) => {
    const [x, y] = parseCell(t.slice(0, -1));
    const o = t.slice(-1).toLowerCase();
    if (o !== "h" && o !== "v") throw new Error(`"${t}": end each ship with h or v`);
    return { x, y, vertical: o === "v" };
  });
  if (ships.length !== 4) throw new Error("A fleet is 4 ships: lengths 4, 3, 3, 2");
  const bad = fleetProblem(ships);
  if (bad) throw new Error(bad);
  return ships;
};

const draw = (l: Ledger, me: 1 | 2 | null, mine: Placement[] | null) => {
  const shotsAt = (n: 1 | 2) => (n === 1 ? l.shots_at1 : l.shots_at2);
  const grid = (n: 1 | 2, ships: Placement[] | null) => {
    const s = shotsAt(n);
    const rows = [`   ${[...COLS].join(" ")}`];
    for (let y = 0; y < BOARD; y++) {
      let r = `${y + 1}  `;
      for (let x = 0; x < BOARD; x++) {
        const c = BigInt(y * BOARD + x);
        r += (s.member(c) ? (s.lookup(c) ? "X" : "o") : ships && isHitAt(ships, x, y) ? "■" : "·") + " ";
      }
      rows.push(r);
    }
    return rows;
  };
  const opp = me === 2 ? 1 : 2;
  const left = grid(me ?? 1, me ? mine : null);
  const right = grid(opp as 1 | 2, null);
  console.log(`  ${(me ? "Your fleet" : "Fleet 1").padEnd(22)}${me ? "Enemy waters" : "Fleet 2"}`);
  for (let i = 0; i < left.length; i++) console.log(`  ${left[i].padEnd(22)}${right[i]}`);
  console.log("");
};

const main = async () => {
  const { cmd, args, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help") return console.log(HELP);

  const net = loadNetwork(flags.net ?? "preprod");
  const player = flags.as ?? "me";
  console.log(`\n  salvo · ${net.name} · playing as "${player}"\n`);

  const seed = loadOrCreateSeed(net);
  const ctx = await buildWallet(net, seed);
  const p = await S.providersFor(net, ctx, player);
  const address = cmd === "join" ? args[0] : (flags.game ?? S.loadGameAddress(net));
  const need = () => {
    if (!address) throw new Error("No game. Run `new`, `join <address>` or pass --game <address>.");
    return address;
  };
  if (address && cmd !== "new") S.scopeToGame(p, address);
  const game = () => step("Opening the game", () => S.open(p, need()));
  const l = () => S.readLedger(p, need());

  try {
    switch (cmd) {
      case "new": {
        const ships = parseFleet(flags.fleet);
        const a = await step("Deploying the game and committing your fleet", () => S.create(net, p, BigInt(Number(args[0] ?? 60) * 60), ships));
        console.log(`\n  Game: ${a}\n  Send this address to your opponent. You fire first.\n`);
        break;
      }
      case "join":
        await step("Proving your fleet and joining", () => S.join(net, p, need(), parseFleet(flags.fleet)));
        console.log("  Joined. Your opponent fires first.\n");
        break;
      case "fire": {
        const shots = args.map(parseCell);
        const c = await game();
        await step(`Answering and firing at ${args.join(" ").toUpperCase()}`, () => S.fire(c, shots));
        console.log("");
        break;
      }
      case "claim":
        await step("Claiming the win on time", async () => (await game()).callTx.claim_timeout());
        break;
      case "resign":
        await step("Resigning", async () => (await game()).callTx.resign());
        break;
      case "show":
        await step("Revealing your fleet", async () => (await game()).callTx.show_fleet());
        break;
      case "board": {
        const s = await l();
        const me = await S.seat(p, s);
        const f = await S.myFleet(p);
        const phase = ["waiting for player 1", "waiting for an opponent", "playing", "over"][s.phase];
        console.log(`  ${need()}\n  ${phase} · moves ${s.moves} · hits on 1: ${s.hits_on1}/12 · hits on 2: ${s.hits_on2}/12`);
        if (s.phase === Phase.playing) {
          const left = Math.max(0, Number(s.deadline) - Date.now() / 1000);
          const who = me ? (Number(s.turn) === me ? "your move" : "their move") : `player ${s.turn} to move`;
          console.log(`  ${who} · ${Math.floor(left / 60)}m ${Math.floor(left % 60)}s left`);
        }
        if (s.phase === Phase.over) console.log(`  player ${s.winner} won${s.by_timeout ? " on time" : ""}${me ? (Number(s.winner) === me ? " (you)" : "") : ""}`);
        console.log("");
        draw(s, me, f ? fromShips(f.ships) : null);
        break;
      }
      default:
        console.log(HELP);
    }
  } finally {
    await persistWallet(net, seed, ctx.wallet);
    await ctx.wallet.stop();
  }
};

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`\n  Error: ${(e as Error).message}\n`);
    process.exit(1);
  },
);
