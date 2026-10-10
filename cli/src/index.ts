#!/usr/bin/env -S node --import tsx
// SPDX-License-Identifier: Apache-2.0
//
// bidlock: run a sealed-bid tender on a Midnight network.
//
//   npm run bidlock -- <command> [args] [--net preprod] [--as <actor>]
//
// Actors are local private-state namespaces: "buyer" (the default) or any
// supplier name. One wallet pays fees for all of them in this CLI.

import { toHex } from "@bidlock/contract";
import * as B from "./bidlock.js";
import { loadNetwork } from "./config.js";
import { buildWallet, loadOrCreateSeed, persistWallet, step } from "./wallet.js";

const HELP = `
bidlock: sealed-bid tenders on Midnight

Buyer (--as buyer, the default):
  deploy "<title>" <ceiling> [bidHours=24] [revealHours=24]
  qualify <commitment>        Pre-qualify a supplier (anonymous commitment)
  openings                    Decrypt the openings revealed to you
  award [--exclude 1,2]       Prove and publish the lowest bid as the winner

Supplier (--as <name>):
  credential                  Create your supplier secret; prints the commitment for the buyer
  bid <amount>                Place a sealed bid (proves: qualified, ≤ ceiling, first bid)
  reveal "<company>"          After the deadline, send your opening sealed to the buyer
  accept "<company>"          If you won, step forward by name
  dispute                     If you were excluded but cheaper, contest the award

Anyone:
  status                      Public state of the tender

Options: --net preprod|preview|undeployed (default preprod)  --as <actor>  --contract <address>
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

const when = (t: bigint) => new Date(Number(t) * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";

const main = async () => {
  const { cmd, args, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help") return console.log(HELP);

  const net = loadNetwork(flags.net ?? "preprod");
  const actor = flags.as ?? "buyer";
  console.log(`\n  bidlock · ${net.name} · acting as "${actor}"\n`);

  const seed = loadOrCreateSeed(net);
  const ctx = await buildWallet(net, seed);
  const p = await B.providersFor(net, ctx, actor);
  const address = flags.contract ?? B.loadRecord(net).contractAddress;
  const need = () => {
    if (!address) throw new Error("No contract address. Run `deploy` or pass --contract <address>.");
    return address;
  };
  if (address && cmd !== "deploy") B.scopeToTender(p, address);
  const contract = () => step("Joining tender", () => B.join(p, need()));
  const l = () => B.readLedger(p, need());
  const done = (r: { txId: string; block: number }) => console.log(`  tx ${r.txId} · block ${r.block}\n`);

  try {
    switch (cmd) {
      case "deploy": {
        const [title = "Ring Road 3 resurfacing", ceiling = "1200000", bidH = "24", revH = "24"] = args;
        const r = await step(`Deploying "${title}"`, () => B.deploy(net, p, title, BigInt(ceiling), Number(bidH), Number(revH)));
        console.log(`\n  Contract: ${r.address}\n  Tx:       ${r.txId}\n  Bids close ${when(r.closesAt)}\n`);
        break;
      }
      case "qualify":
        done(await step("Qualifying supplier", async () => B.qualify(await contract(), args[0])));
        break;
      case "credential":
        console.log(`  Supplier commitment (send to the buyer):\n  ${await B.newCredential(p)}\n`);
        break;
      case "bid": {
        const r = await step(`Proving and sealing your bid`, async () => B.bid(p, await contract(), BigInt(args[0])));
        console.log(`  Bid #${r.index} sealed.`);
        done(r);
        break;
      }
      case "reveal": {
        const c = await contract();
        const r = await step("Sealing your opening to the buyer", async () => B.reveal(p, await l(), c, args[0] ?? actor));
        done(r);
        break;
      }
      case "openings":
        for (const [i, o] of B.openings(net, await l())) console.log(`  #${i}  €${o.opening.amount.toLocaleString("en-GB")}  ${o.company}`);
        console.log("");
        break;
      case "award": {
        const c = await contract();
        const exclude = flags.exclude ? flags.exclude.split(",").map((x) => BigInt(x)) : [];
        const r = await step("Proving the award", async () => B.award(net, p, await l(), c, { exclude }));
        console.log(`  Bid #${r.winner} wins at €${r.amount.toLocaleString("en-GB")}.`);
        done(r);
        break;
      }
      case "accept":
        done(await step("Claiming the award", async () => B.accept(await contract(), args[0] ?? actor)));
        break;
      case "dispute":
        done(await step("Proving your bid beat the winner", async () => B.dispute(p, await contract())));
        break;
      case "status": {
        const s = await l();
        const now = BigInt(Math.floor(Date.now() / 1000));
        const phase = s.awarded ? "awarded" : now < s.closes_at ? "bidding" : now < s.reveal_until ? "reveal" : "evaluation";
        console.log(`  ${s.title} · ${need()}`);
        console.log(`  phase ${phase} · ceiling €${s.ceiling.toLocaleString("en-GB")} · closes ${when(s.closes_at)} · reveal until ${when(s.reveal_until)}`);
        console.log(`  qualified ${s.supplier_count} · bids ${s.bid_count} · revealed ${s.sealed_openings.size()}`);
        for (const [i, c] of s.bids) console.log(`    #${i}  ${toHex(c).slice(0, 24)}…`);
        if (s.awarded) {
          console.log(`  winner #${s.winner} at €${s.winning_amount.toLocaleString("en-GB")}${s.accepted ? ` · ${s.winner_name}` : ""}`);
          console.log(`  contested: ${s.contested}${s.contested ? ` (${s.disputes} dispute(s))` : ""}`);
        }
        console.log("");
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
