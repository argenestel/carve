#!/usr/bin/env -S node --import tsx
// SPDX-License-Identifier: Apache-2.0
//
// carve: exclusive licensing with a private book, from the terminal.
//
//   npm run carve -- <command> [args] [--net preprod] [--as <user>]
//
// Users are local identities ("me" by default), each with its own private
// state. One wallet pays fees for all of them in this CLI.

import {
  CATEGORIES,
  type Grant,
  REGIONS,
  conflicts,
  decodeLicense,
  encodeLicense,
  fromHex,
  grantProblem,
  indexes,
  makeGrant,
  pureCircuits,
  randomBytes,
  startedClean,
  termsHash,
  toHex,
} from "@carve/contract";
import { loadNetwork } from "./config.js";
import * as C from "./carve.js";
import { buildWallet, loadOrCreateSeed, persistWallet, step } from "./wallet.js";

const HELP = `
carve: exclusive licensing with a private book, on Midnight

  id                         Your licensee ID (send it to a licensor)
  new "<title>"              Deploy a book for a property; you are its licensor
  issue                      Issue a grant. Proves it overlaps no exclusive grant.
      --to <licensee ID | local user>  --regions "south asia,east asia"  --categories food
      --from 2027-01  --months 12  [--shared]  [--terms "8% royalty"]
  book                       The ledger, and your private book if you're the licensor
  accept <license code>      Check a license against the ledger and accept it
  prove <grant#> <region> <category> <check>   Answer a check with a proof
  check <check>              Read a check's answer

Options: --net preprod|preview|undeployed (default preprod)  --as <user>  --book <address>
Regions:    ${REGIONS.join(", ")}
Categories: ${CATEGORIES.join(", ")}
`;

const parseArgs = (argv: string[]) => {
  const flags: Record<string, string> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--shared") flags.shared = "1";
    else if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { cmd: pos[0], args: pos.slice(1), flags };
};

/** "south asia" or "6" → index into names. */
const pick = (names: readonly string[], s: string): number => {
  const t = s.trim().toLowerCase();
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= names.length) return n - 1;
  const i = names.findIndex((x) => x.toLowerCase().startsWith(t) || x.toLowerCase().includes(t));
  if (i < 0) throw new Error(`"${s}" is not one of: ${names.join(", ")}`);
  return i;
};
const pickAll = (names: readonly string[], s: string | undefined) => (s ? s.split(",").map((x) => pick(names, x)) : []);

const monthStart = (ym: string, add = 0) => {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`"${ym}" is not a month (YYYY-MM)`);
  return BigInt(Date.UTC(Number(m[1]), Number(m[2]) - 1 + add, 1) / 1000);
};
const ym = (t: bigint) => new Date(Number(t) * 1000).toISOString().slice(0, 7);
const describe = (g: Grant) =>
  `${indexes(g.regions).map((i) => REGIONS[i]).join(", ")} × ${indexes(g.categories).map((i) => CATEGORIES[i]).join(", ")}, ${ym(g.start)} to ${ym(g.end - 1n)}, ${g.exclusive ? "exclusive" : "non-exclusive"}`;

const main = async () => {
  const { cmd, args, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help") return console.log(HELP);

  const net = loadNetwork(flags.net ?? "preprod");
  const user = flags.as ?? "me";
  if (cmd === "id") return console.log(`\n  Licensee ID for "${user}":\n  ${C.licenseeId(net, user)}\n`);
  console.log(`\n  carve · ${net.name} · as "${user}"\n`);

  const seed = loadOrCreateSeed(net);
  const ctx = await buildWallet(net, seed);
  const p = await C.providersFor(net, ctx, user);
  const address = cmd === "accept" ? decodeLicense(args[0] ?? "")?.address : (flags.book ?? C.loadBookAddress(net));
  const need = () => {
    if (!address) throw new Error("No book. Run `new`, or pass --book <address>.");
    return address;
  };
  if (address && cmd !== "new") C.scopeToBook(p, address);
  const book = () => step("Opening the book", () => C.open(net, p, user, need()));

  try {
    switch (cmd) {
      case "new": {
        if (!args[0]) throw new Error('Give the property a name: new "Mochi the Cat"');
        const a = await step("Deploying the book", () => C.create(net, p, user, args[0]));
        console.log(`\n  Book: ${a}\n  You are its licensor. Issue grants with \`issue\`.\n`);
        break;
      }
      case "issue": {
        if (!flags.to) throw new Error("Who is it for? --to <licensee ID or local user>");
        const licensee = /^[0-9a-f]{64}$/i.test(flags.to) ? fromHex(flags.to.toLowerCase()) : fromHex(C.licenseeId(net, flags.to));
        const from = flags.from ?? new Date().toISOString().slice(0, 7);
        const note = flags.terms ?? "";
        const g = makeGrant({
          regions: pickAll(REGIONS, flags.regions),
          categories: pickAll(CATEGORIES, flags.categories),
          start: monthStart(from),
          end: monthStart(from, Number(flags.months ?? 12)),
          exclusive: !flags.shared,
          licensee,
          terms: await termsHash(note),
          salt: randomBytes(),
        });
        const bad = grantProblem(g);
        if (bad) throw new Error(bad);
        const l = await C.readLedger(p, need());
        const ps = await C.privateState(p);
        const id = Number(l.issued);
        if (ps?.book) {
          const hit = conflicts(ps.book, id, g);
          if (hit.length) console.log(`  Clashes with ${hit.map((i) => `#${i + 1}`).join(", ")}. Asking the contract anyway…`);
        }
        const c = await book();
        await step(`Proving grant #${id + 1} overlaps nothing exclusive`, () => C.issue(c, g));
        const code = encodeLicense({ address: need(), id, title: l.title, note, grant: g });
        console.log(`\n  Grant #${id + 1}: ${describe(g)}\n  Send the licensee this code, privately:\n\n  ${code}\n`);
        break;
      }
      case "book": {
        const l = await C.readLedger(p, need());
        const d = await C.readDeployLedger(p, need());
        const ps = await C.privateState(p);
        const mine = !!ps?.book && toHex(pureCircuits.licensor_key(ps.secret)) === toHex(l.licensor);
        console.log(`  ${l.title}\n  ${need()}`);
        console.log(`  ${l.issued} issued · ${l.accepted.size()} accepted · ${l.checks.size()} checks · ${d && startedClean(d) ? "started clean" : "NOT a clean deploy"}\n`);
        for (const [id, commitment] of l.grants) {
          const g = mine ? ps.book!.grants[Number(id)] : null;
          const acc = l.accepted.member(id) ? "accepted" : "not accepted";
          console.log(`  #${Number(id) + 1}  ${g ? describe(g) : toHex(commitment)}  (${acc})`);
        }
        console.log("");
        break;
      }
      case "accept": {
        const lic = decodeLicense(args[0] ?? "");
        if (!lic) throw new Error("That is not a license code");
        const l = await C.readLedger(p, lic.address);
        console.log(`  ${lic.title} · grant #${lic.id + 1}\n  ${describe(lic.grant)}${lic.note ? `\n  Terms: ${lic.note}` : ""}\n`);
        if (!l.grants.member(BigInt(lic.id)) || toHex(l.grants.lookup(BigInt(lic.id))) !== toHex(pureCircuits.grant_commitment(lic.grant)))
          throw new Error("The ledger has no grant with these terms");
        await step("Proving you hold this grant", () => C.accept(net, p, user, lic));
        console.log("  Accepted.\n");
        break;
      }
      case "prove": {
        const [id, region, category, check] = args;
        if (!check) throw new Error("prove <grant#> <region> <category> <check>");
        const c = await book();
        await step("Proving your rights", () => C.proveRights(c, Number(id) - 1, pick(REGIONS, region), pick(CATEGORIES, category), fromHex(check)));
        console.log("");
        break;
      }
      case "check": {
        const l = await C.readLedger(p, need());
        const q = fromHex(args[0] ?? "");
        if (!l.checks.member(q)) console.log("  Not answered yet.\n");
        else {
          const a = l.checks.lookup(q);
          console.log(
            `  Licensed: grant #${Number(a.grant) + 1}, ${REGIONS[Number(a.region)]} × ${CATEGORIES[Number(a.category)]}, ${a.exclusive ? "exclusive" : "non-exclusive"}, proven ${new Date(Number(a.at) * 1000).toISOString()}\n`,
          );
        }
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
