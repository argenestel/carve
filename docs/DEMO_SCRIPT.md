# Demo script (about 3 minutes)

**Setup:** two browser profiles (A and B), each with Lace on Preprod and funded from the faucet. The app runs locally (`npm run dev`) or deployed.

1. **Hook (15 s).** "Online Battleship needs a server you trust with both fleets. Salvo has no server. Your fleet never leaves your device, and every hit is proven."
2. **Create (30 s, profile A).** New game, drag a ship, rotate one, then Create game. Show the two Lace approvals: deploy, then *prove and commit fleet*. Point out that only a hash went on-chain.
3. **Join (30 s, profile B).** Paste the link, Shuffle, Join game. Lace proves the fleet is legal.
4. **Play (60 s).** A fires three shots. B's board pulses with incoming shots. B picks three targets and fires: one transaction proves B's answers and fires back. A's board fills in proven hits and misses.
5. **Try to cheat (20 s).** In B's devtools, edit the fleet in localStorage and try to fire. Proof generation fails with "That is not the fleet you committed to".
6. **Spectate (15 s).** Open the link in a third window: both boards, every proven mark, no ships.
7. **Close (10 s).** The clock, claiming a timeout, show-fleet at the end, and the same pattern for any hidden-information game.
