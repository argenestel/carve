# Carve

**Sell exclusive rights. Keep your book private.** Carve lets a rights holder license a property (a character, a brand, a song) by region, product category and time. Midnight proves each new grant doesn't overlap an exclusive one already sold, and nobody, not even the licensees, sees who else bought what.

## The problem

Licensing runs on exclusivity: *"you are the only one selling Mochi the Cat drinks in South Asia until 2028"*. Today that promise is only as good as the licensor's spreadsheet:

- **Licensees can't verify it.** The licensor's deal book is confidential: competitors' names, territories, fees. A licensee has to trust that nobody else was sold the same rights. Overlapping grants are a common source of licensing disputes, and they are found after the money is spent.
- **Licensors can't prove it** without showing their whole book, which they never will.
- **Retailers and marketplaces can't check it.** "Are you actually licensed for this?" is answered with a PDF.

A public registry would fix verification and destroy confidentiality. Midnight lets the licensor keep the book private and *prove* things about it.

## How Carve works

| Step | Who | What happens | Proven in zero knowledge | What stays private |
|---|---|---|---|---|
| **Open a book** | licensor | Deploys a contract for one property; the title is public | — | the book (empty, salted) |
| **Issue** | licensor | Adds a grant: regions × categories × period, exclusive or not, for one licensee | the grant overlaps **no exclusive grant in the whole book** (and if exclusive, no grant at all); the book on the device is the one committed on-chain, with nothing removed | every grant, every licensee, every term |
| **Accept** | licensee | Opens the license link, checks it against the ledger, countersigns | they are the named licensee; these exact terms were issued | who they are, what they hold |
| **Prove** | licensee | Answers a retailer's check: *"licensed for Food & drink in South Asia?"* | their accepted grant covers that region and category **today** | their other regions, dates, terms and identity |

The ledger only ever holds a **commitment to the book**, a **commitment per grant**, the **count** of grants, which ones are **accepted**, and the **answers to checks**. The book lives on the licensor's device. Each grant reaches its licensee privately, as a link.

**What it rules out:**
- *Double-selling exclusivity:* `issue` checks the new grant against every earlier grant in a proof. It can't be produced for an overlap, even by the licensor's own client.
- *Quietly deleting a grant to make room:* the book is committed on-chain, and `issue` proves the book it checks against is that commitment.
- *Changing terms after the deal:* the licensee checks their opening against the grant's commitment, and `accept` proves it.
- *Someone else using your license:* `accept` and `prove_rights` require the secret behind the licensee key named in the grant.
- *A tampered deployment:* the constructor isn't proven, so the app reads the **deploy transaction's state** and shows *Started clean* only if the book began empty. Every change after that is proven.

## Run it

Carve is a real dApp on **Midnight Preprod**. Every action is a transaction you prove and sign in Lace.

### Requirements

- [Lace](https://www.lace.io/) with Midnight enabled and set to **Preprod**, funded with tNIGHT from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/). Fees are paid in tDUST, generated from tNIGHT.
- Node 22+, Compact toolchain `0.31.1`.

> Since 2026-10-09 the Preprod indexer and RPC are run by [Blockfrost](https://blockfrost.io) (see the [Midnight docs](https://docs.midnight.network/guides/networks-and-environments)). The web app reads through the indexer configured in Lace. To let people read books and checks *without* a wallet, set `VITE_BLOCKFROST_PROJECT_ID` (see `app/.env.example`). The CLI needs `BLOCKFROST_PROJECT_ID`.

### Web app

```bash
npm install
npm run compile        # compact compile +0.31.1 → contract/src/managed/carve (keys + zkir)
npm run build --workspace contract
npm run dev            # → http://localhost:5173
```

Use two browser profiles, each with Lace: one for the **licensor**, one for the **licensee**.

1. **Licensee:** open **Licenses** and copy your licensee ID. Send it to the licensor.
2. **Licensor:** **Open a book**, name the property, approve in Lace. On the rights map, tap regions and categories, pick a period, paste the licensee ID and click **Issue grant**. The map shows clashes before you prove; **Try anyway** sends it to the contract, which refuses.
3. **Licensor:** copy the license link and send it to the licensee.
4. **Licensee:** open the link. Carve checks it against the ledger (issued, names you, terms match). Click **Accept license**.
5. **Retailer** (anyone): open the book, pick a region and category, **Create check**, and send the link to the licensee. The licensee opens it and clicks **Prove it**. The retailer's page flips to *Exclusive* or *Licensed*.

Each browser's identity secret, the licensor's book and the licensee's grants are kept in that browser's localStorage. The licensor must use the same browser for every issue.

### CLI

A headless client for scripted runs, or to play one side from a terminal.

```bash
export BLOCKFROST_PROJECT_ID=nightpreprod...
npm run proof-server --workspace cli    # midnightntwrk/proof-server:8.0.3 on :6300 (needs Docker)

npm run carve -- id --as ana                        # ana's licensee ID
npm run carve -- new "Mochi the Cat (character art)"
npm run carve -- issue --to ana --regions "south asia" --categories food --from 2027-01 --months 24 --terms "8% royalty"
npm run carve -- issue --to ben --regions "south asia" --categories food --from 2027-06   # refused: overlaps #1
npm run carve -- accept <license code> --as ana
npm run carve -- prove 1 "south asia" food <check id> --as ana
npm run carve -- book
```

The first run prints a wallet address; fund it from the faucet. Local secrets live in `cli/.carve/<network>/` (git-ignored). `--as <name>` keeps separate users' identities and private state apart.

### Tests

```bash
npm test     # 28 contract tests
```

The suite runs the compiled circuits against an in-memory ledger with a controllable block clock. It covers:
- **opening a book:** clean deploy state, public title and keys only;
- **issuing:**
  - overlaps refused;
  - differences in region, category or time allowed, including back-to-back periods;
  - multi-region × multi-category overlaps;
  - every earlier grant checked, not just the last;
  - non-exclusive grants stacking but never with an exclusive one;
  - malformed grants refused;
  - outsiders refused;
  - a book with a grant removed, or a stale copy of the book, refused;
  - the 16-grant limit;
  - commitments that differ even for identical terms;
  - the circuit's clash rule agreeing with the TypeScript one on 300 random pairs;
- **licensees:** the named licensee accepts; someone else with the same terms, altered terms, unknown grants and double acceptance are refused;
- **proving rights:**
  - covered region and category today;
  - uncovered region, category or dates refused, including not-yet-started and expired grants;
  - unaccepted grants refused;
  - someone else's secret refused;
  - a reused check refused;
  - a clock far from the chain's refused;
- **license codes:** round trip, garbage rejected.

## Architecture

```
contract/  carve.compact · witnesses · rights (TS mirror, license codes) · simulator · tests   @carve/contract
app/       React + Vite dApp: Lace connector v4, wallet-side proving                           @carve/app
cli/       midnight-js 4.1.1 + wallet-sdk; preprod / preview / local                           @carve/cli
```

**Public ledger:** `title` · `licensor` (key) · `book` (commitment) · `issued` (count) · `grants` (number → commitment) · `accepted` (set of numbers) · `checks` (check id → grant number, region, category, exclusive, time).

**Private state** (each user's device): an identity secret, from which the licensor and licensee keys are derived. The licensor also holds the **book**: up to 16 grants and a salt. The licensee also holds the **grants** issued to them.

| Circuit | Caller | Key checks |
|---|---|---|
| `constructor` | licensor | sets title, licensor key and the empty book's commitment (not proven, so clients verify the deploy state) |
| `issue(grant)` | licensor | caller is the licensor; book opening = on-chain commitment; book not full; grant well-formed; no clash with any of the first `issued` grants; writes the new book commitment and the grant commitment |
| `accept(id)` | licensee | grant opening = `grants[id]`; caller's key = the grant's licensee; not yet accepted |
| `prove_rights(id, region, category, check)` | licensee | as `accept`, plus accepted; check unused; grant covers region and category at the current time |

Two grants **clash** when either is exclusive and they share a region, a category and some time. Grant commitments are SHA-256 (`persistentHash`), domain-separated (`carve:grant:v1`), and salted. The book commitment is Poseidon (`transientHash`), salted, because every `issue` re-hashes the whole book in-circuit, and SHA-256 over 16 grants made the proving key four times larger (76 MB, now 19 MB). Times come from a witness bounded by `blockTimeGte` and `blockTimeLt`.

## Limitations

- **One book per contract, 16 grants.** The book is a fixed-size vector that is hashed in every `issue` proof. **Next:** a Merkle-tree book, so `issue` only touches the grants that share a region.
- **The property's identity is off-chain.** Nothing stops a licensor from opening two books for the same character. **Next:** a registry contract that binds a property to one book and to its owner's credential.
- **The grant count is public.** Anyone can see how many deals a property has. Padding with dummy grants hides it at the cost of slots.
- **Browser storage.** The book and grants live in localStorage, unencrypted and tied to one browser. **Next:** an encrypted export, and wallet-derived identity.
- **Fees.** Each action is a transaction paid in tDUST.

## Roadmap

Merkle-tree books with hundreds of grants · property registry and owner credentials · sublicensing (a licensee carves their own grant into sub-grants, proven to stay inside it) · royalty reporting proven against the grant's terms · marketplace integration for the check flow.

## License

Apache License 2.0, see [LICENSE](LICENSE). The CLI wallet code is adapted from [midnightntwrk/example-counter](https://github.com/midnightntwrk/example-counter) via [mashharuki/midnight-rps-sample-app](https://github.com/mashharuki/midnight-rps-sample-app) (both Apache-2.0).

Built on [Midnight](https://midnight.network) for the Midnight Buildathon on AKINDO.
