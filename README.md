# Bidlock

**Sealed-bid public tenders on Midnight. The buyer proves the award was fair, and losing prices are never revealed.**

## The problem

Public procurement accounts for a large share of government spending, and sealed-bid tenders are where it goes wrong:

- **Leaked bids.** Whoever can see the bids before the deadline can tip off a favoured supplier.
- **Rigged awards.** "The lowest bid wins" is something the buyer asserts, not something anyone can check without seeing every bid.
- **Exposed prices.** Publishing every bid to make the award checkable hands each supplier's cost structure to its competitors, which helps cartels coordinate.

The usual fixes trade transparency against confidentiality. Midnight lets a tender have both.

## How Bidlock works

| Phase | What happens | What's proven in ZK | What stays private |
|---|---|---|---|
| **Qualify** | The buyer enrols pre-qualified suppliers as hash commitments in a Merkle tree | the buyer holds the buyer key | which commitment belongs to whom (only the buyer knows) |
| **Bid** | The supplier posts a commitment to its price | it is a qualified supplier, this is its first bid, and the price is > 0 and ≤ the ceiling | **who** bid, and the **price**, from everyone, buyer included |
| **Reveal** | After the deadline, the supplier sends its opening sealed to the buyer's key (X25519) | it owns that bid | the price, from everyone but the buyer |
| **Award** | The buyer publishes the winner | **every counted opening matches its on-chain commitment, and the winner is the lowest of them** | **every losing price** |
| **Dispute** | A revealed bidder the buyer left out can contest | its sealed bid was lower than the winner's | the disputer chooses to make its own price public |

After the award, the public sees the winner, the winning price, which bids were counted, and whether the award is contested. Losing bidders stay anonymous and their prices stay sealed.

The buyer can't fake the result. Lying about any opening, picking a bid that isn't the lowest, or forging the winning price all fail the proof. The only way to cheat is to leave a bid out, and that's public: the excluded bidder can prove it was cheaper, and the tender is marked **contested** on-chain for good.

## Run it

Bidlock is a real dApp on **Midnight Preprod**. Every action is a transaction you prove and sign in Lace.

### Requirements

- [Lace](https://www.lace.io/) with Midnight enabled and set to **Preprod**, funded with tNIGHT from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/). Fees are paid in tDUST, generated from tNIGHT.
- Node 22+, Compact toolchain `0.31.1`.

> Since 2026-10-09 the Preprod indexer and RPC are run by [Blockfrost](https://blockfrost.io) (see the [Midnight docs](https://docs.midnight.network/guides/networks-and-environments)). The web app reads through the indexer configured in Lace. To let people view tenders *without* a wallet, set `VITE_BLOCKFROST_PROJECT_ID` (see `app/.env.example`). The CLI needs `BLOCKFROST_PROJECT_ID`.

### Web app

```bash
npm install
npm run compile        # compact compile +0.31.1 → contract/src/managed/bidlock (keys + zkir)
npm run build --workspace contract
npm run dev            # → http://localhost:5173
```

**Buyer:** *New tender*: set the title, ceiling, bid deadline and reveal deadline, then **Deploy** (proved and signed in Lace). Share the tender link.

**Supplier:** open the link, click **Request to bid**, and send the request link back to the buyer. A per-tender supplier secret is created in your browser; only its hash leaves it. Once qualified, enter your price and **Seal bid**. After the deadline, **Reveal to buyer**. After the award, claim it if you won, or dispute if you were cut.

**Buyer again:** open each request link and **Qualify**. After the reveal window, the buyer's browser decrypts the openings and **Award** proves that the lowest counted bid wins.

**Anyone** with the link can watch the tender. The **Your view / Public view** switch shows what's on-chain: hash commitments only.

Private state (secrets, your bid's amount and salt, the buyer's decryption key) is kept in this browser's localStorage, scoped per tender. Use the same browser for the whole tender.

### CLI

```bash
export BLOCKFROST_PROJECT_ID=nightpreprod...
npm run proof-server --workspace cli    # midnightntwrk/proof-server:8.0.3 on :6300 (needs Docker)

npm run bidlock -- deploy "Ring Road 3 resurfacing" 1200000 1 1     # 1h bidding, 1h reveal
npm run bidlock -- credential --as atlas          # supplier → commitment
npm run bidlock -- qualify <commitment>            # buyer
npm run bidlock -- bid 820000 --as atlas
npm run bidlock -- reveal "Atlas Paving" --as atlas    # after the deadline
npm run bidlock -- openings                         # buyer, after the reveal window
npm run bidlock -- award
npm run bidlock -- accept "Atlas Paving" --as atlas
npm run bidlock -- status
```

The first run prints a wallet address; fund it from the faucet. Local secrets live in `cli/.bidlock/<network>/` (git-ignored).

### Tests

```bash
npm test     # 27 contract tests
```

The contract suite runs the compiled circuits against a controllable block clock. It covers qualification (duplicates, impostor buyer, late qualification), bidding (unqualified supplier, borrowed Merkle path, second bid, ceiling and zero price, deadline, 8-bid cap, tender-bound commitments), reveal (window, wrong owner, forged opening), award (lowest wins; a lying buyer, a non-lowest winner, a forged winning price, an excluded winner, early, double, or non-buyer awards all rejected; winner acceptance), and disputes (an unfair exclusion is contested; disputes from included, higher, never-revealed, or pre-award bids are rejected).

## Architecture

```
contract/  bidlock.compact · witnesses · simulator · sealing (X25519) · tests     @bidlock/contract
app/       React + Vite dApp: Lace connector v4, wallet-side proving, Preprod      @bidlock/app
cli/       midnight-js 4.1.1 + wallet-sdk; preprod / preview / local               @bidlock/cli
```

**Public ledger:** sealed terms (title, tender id, buyer X25519 key, ceiling, deadlines), the supplier Merkle tree, nullifiers, bid commitments, sealed openings, inclusion flags, the winner and winning price, and the dispute record.

**Private state:** the buyer secret and the buyer's X25519 secret key (buyer); the supplier secret and its bids' amounts and salts (each supplier).

| Circuit | Caller | Key checks |
|---|---|---|
| `constructor` | buyer | ceiling > 0, close < reveal; buyer = H(secret) |
| `qualify` | buyer | buyer secret, before close, commitment not already qualified |
| `submit_bid` | supplier | before close, < 8 bids, Merkle membership, unused nullifier H(secret, tender), 0 < price ≤ ceiling |
| `reveal_bid` | supplier | inside the reveal window, owns the bid, not already revealed |
| `award` | buyer | after the reveal window; for each of 8 slots: counted ⇒ opening matches its commitment and winner ≤ it; winner counted |
| `accept_award` | winner | owns the winning bid |
| `dispute` | supplier | awarded, owns the bid, revealed, excluded, and lower than the winning price |

Hashes are domain-separated (`bidlock:buyer:v1`, `bidlock:supplier:v1`, `bidlock:bid:v1`, `bidlock:nullifier:v1`), and bid commitments are bound to the tender id.

## Limitations

- **Garbage openings.** A bidder could reveal an envelope that doesn't decrypt, get excluded, and then dispute. A dispute marks the award for review; it doesn't overturn it. **Next:** the buyer publishes that envelope's per-envelope shared key so anyone can check that it really fails to decrypt.
- **Price only.** Awards go to the lowest price. Weighted price/quality scoring (MEAT, as EU procurement rules call it) is on the roadmap.
- **8 bids per tender.** That's the size of the award circuit. Larger tenders need a bigger circuit, or a tournament across several proofs.
- **Fees.** Each transaction pays fees from a wallet. Suppliers should use wallets that aren't linked to their company, and a fee-sponsoring relayer is planned.
- **Browser storage.** Private state lives in localStorage, unencrypted and tied to one browser. **Next:** an encrypted export/import and a passphrase.

## Roadmap

Encrypted private-state backup · price/quality (MEAT) scoring · garbage-envelope rebuttal · fee relayer · multi-lot tenders · signed award reports for audit bodies.

## License

Apache License 2.0, see [LICENSE](LICENSE). The CLI wallet code is adapted from [midnightntwrk/example-counter](https://github.com/midnightntwrk/example-counter) via [mashharuki/midnight-rps-sample-app](https://github.com/mashharuki/midnight-rps-sample-app) (both Apache-2.0).

Built on [Midnight](https://midnight.network) for the Midnight Buildathon on AKINDO.
