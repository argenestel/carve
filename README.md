# Salvo

**Battleship on Midnight, with no one to trust.** Your fleet never leaves your device, and every hit or miss your opponent reports is checked by a zero-knowledge proof.

## The problem

Hidden-information games are what online play does worst. Battleship, poker, fog-of-war strategy and card drafting all need someone to hold the secrets:

- **A game server** sees both fleets. It can leak them, be hacked, or be bribed, and you have to take its word for every result.
- **Fully on-chain** games can't hide anything: everything on a public chain is public.
- **Commit-reveal** schemes only catch a cheater at the end, after the game is lost, and a losing player can simply walk away instead of revealing.

Midnight lets each player keep their own secret and *prove* every answer about it as the game goes on.

## How Salvo works

| Step | What happens | Proven in zero knowledge | What stays private |
|---|---|---|---|
| **Hide** | Each player commits to their fleet: a hash goes on-chain | the fleet is legal: 4 ships (4, 3, 3, 2) inside the 8×8 sea, no overlaps | where every ship is |
| **Fire** | The player to move fires a salvo of up to 3 shots | it's their turn, the shots are on the board, no repeats | nothing; shots are public |
| **Answer** | On their next move, the defender answers each incoming shot | each hit or miss is true for the committed fleet | the fleet; only "hit" or "miss" is published |
| **Sink** | First to hit all 12 cells wins | the shooter's hits really total 12 | the loser's remaining ships |
| **Clock** | Every move restarts the opponent's clock (10 min, 1 hour or 1 day) | the move's timestamp is within 30 min of the block's | — |

Answering and firing happen in **one transaction**: your move proves your answers to their last salvo and fires yours. A whole game is about 10 to 15 moves each.

**Nobody can cheat:**
- *Lying about a hit:* the answer proof fails.
- *Moving a ship mid-game:* every answer is checked against the original commitment.
- *An illegal fleet* (overlapping, off the board, or missing ships): the commitment proof fails.
- *Refusing to answer when losing:* the clock runs out and the opponent claims the win on-chain.

Ship positions never touch the ledger, not even as arguments to ledger operations, so nothing on-chain reveals them. After the game, either player can **show their fleet**. It is checked against their commitment and drawn on the opponent's board.

## Run it

Salvo is a real dApp on **Midnight Preprod**. Every move is a transaction you prove and sign in Lace.

### Requirements

- [Lace](https://www.lace.io/) with Midnight enabled and set to **Preprod**, funded with tNIGHT from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/). Fees are paid in tDUST, generated from tNIGHT.
- Node 22+, Compact toolchain `0.31.1`.

> Since 2026-10-09 the Preprod indexer and RPC are run by [Blockfrost](https://blockfrost.io) (see the [Midnight docs](https://docs.midnight.network/guides/networks-and-environments)). The web app reads through the indexer configured in Lace. To let people watch games *without* a wallet, set `VITE_BLOCKFROST_PROJECT_ID` (see `app/.env.example`). The CLI needs `BLOCKFROST_PROJECT_ID`.

### Web app

```bash
npm install
npm run compile        # compact compile +0.31.1 → contract/src/managed/salvo (keys + zkir)
npm run build --workspace contract
npm run dev            # → http://localhost:5173
```

1. **New game:** place your fleet (tap a ship to move it, tap it again to turn it, or Shuffle) and pick the time per move. **Create game** asks Lace twice: once to deploy, once to prove and commit your fleet.
2. **Send the link.** Your opponent opens it, places their fleet and clicks **Join game**.
3. **Play.** On your move, tap up to three cells in *Enemy waters* and click **Fire**. Incoming shots pulse on your own board, and your Fire transaction proves your answers to them.
4. If your opponent's clock runs out, click **Claim the win**. After the game, **Show my fleet to them**.

Anyone with the link who isn't playing sees both boards with every proven hit and miss, and no ships.

Your secret and fleet are kept in this browser's localStorage, scoped to the game. Use the same browser for the whole game.

### CLI

A headless player for scripted games, or to play a friend in the browser from your terminal.

```bash
export BLOCKFROST_PROJECT_ID=nightpreprod...
npm run proof-server --workspace cli    # midnightntwrk/proof-server:8.0.3 on :6300 (needs Docker)

npm run salvo -- new 60                          # 60 minutes per move, random fleet
npm run salvo -- join <address> --fleet "A1h B3h C5v F2v"
npm run salvo -- fire A1 B2 C3
npm run salvo -- board
npm run salvo -- claim | resign | show
```

The first run prints a wallet address; fund it from the faucet. Local secrets live in `cli/.salvo/<network>/` (git-ignored). `--as <name>` keeps separate players' private state apart.

### Tests

```bash
npm test     # 19 contract tests
```

The suite runs the compiled circuits against a controllable block clock. It covers:
- **fleet legality:** the circuit agrees with the TypeScript rules on random fleets, and out-of-bounds, overlapping and illegal joins are rejected;
- **joining:** start, waiting, a third player, the minimum move time;
- **proven answers:** hits, misses and counts;
- **rejected moves:** playing out of turn or as an outsider, answering with a swapped fleet, empty, off-board, duplicate and repeated shots;
- **sinking** a fleet to win;
- **the clock:** claiming too early or by the wrong player, a backdated or future-dated move;
- **after the game:** resigning, and showing a fleet that is checked against its commitment.

## Architecture

```
contract/  salvo.compact · witnesses · simulator · tests                @salvo/contract
app/       React + Vite dApp: Lace connector v4, wallet-side proving   @salvo/app
cli/       midnight-js 4.1.1 + wallet-sdk; preprod / preview / local   @salvo/cli
```

**Public ledger:** player keys (hashes of per-game secrets), fleet commitments, whose turn it is, the incoming salvo, every answered shot (cell → hit), hit counters, the move deadline, the winner, and any fleets shown after the game.

**Private state** (each player's device): the player secret and the fleet (four ships and a salt).

| Circuit | Caller | Key checks |
|---|---|---|
| `constructor` | creator | at least 60 s per move (not proven, so it commits nothing secret) |
| `join` | each player | the fleet is legal; commitment = H(fleet, salt); the second join starts the clock |
| `play` | player to move | their turn; each incoming shot answered against their committed fleet; 1 to 3 new shots on the board, unrepeated; win at 12 hits |
| `claim_timeout` | waiting player | the deadline has passed |
| `resign` | either player | is a player |
| `show_fleet` | either player | the game is over; the fleet matches its commitment |

Hashes are domain-separated (`salvo:player:v1`, `salvo:fleet:v1`). A move's timestamp comes from a witness and is bounded by `blockTimeGte` and `blockTimeLt`, so a player can't backdate a move to shorten their opponent's clock.

## Limitations

- **Board size.** 8×8 with four ships keeps proofs small (the `play` prover key is 5 MB). The circuit is parameterised by constants, so a classic 10×10 is a recompile.
- **No "sunk" call-outs.** Announcing which ship sank would need ledger lookups keyed by ship cells, which would reveal positions. Proving it from the public shot history without leaking anything is on the roadmap.
- **Browser storage.** Your fleet lives in localStorage, unencrypted and tied to one browser. Lose it mid-game and you can't answer, so you lose on time. **Next:** an encrypted export.
- **Fees.** Each move is a transaction paid in tDUST.

## Roadmap

Encrypted fleet backup · private "sunk" proofs · open-games lobby · wagers held in escrow by the contract · the same commit-and-prove pattern for other hidden-information games (Stratego-style, fog-of-war).

## License

Apache License 2.0, see [LICENSE](LICENSE). The CLI wallet code is adapted from [midnightntwrk/example-counter](https://github.com/midnightntwrk/example-counter) via [mashharuki/midnight-rps-sample-app](https://github.com/mashharuki/midnight-rps-sample-app) (both Apache-2.0).

Built on [Midnight](https://midnight.network) for the Midnight Buildathon on AKINDO.
