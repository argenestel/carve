# Salvo: deck outline (8 slides)

1. **Salvo.** Battleship where nobody can cheat: hidden fleets, every hit proven in zero knowledge, on Midnight.
2. **Problem.** Hidden-information games need someone to hold the secrets. Servers can leak and lie, public chains hide nothing, and commit-reveal catches cheaters only after the game, if the loser bothers to reveal.
3. **Insight.** Midnight lets each player keep their own secret and prove every answer about it, move by move. The referee is the contract.
4. **Flow.** Hide (ZK: legal fleet, only a hash on-chain) → Fire up to 3 shots → Answer (ZK: hit or miss against the committed fleet) → Sink 12 cells, or win on the clock.
5. **Live on Preprod.** Two browsers with Lace: create, join, a few salvos; the spectator view shows proven hits and misses and no ships.
6. **Under the hood.** 5 proven circuits, answer and fire in one transaction, a timestamp bounded by block time, 19 passing tests, Compact 0.31.1, a headless CLI player.
7. **Why it matters.** The pattern of a private commitment plus a proven answer each turn works for any hidden-information game: Stratego, fog-of-war, card drafting, and games with wagers held in escrow.
8. **Next.** Private "sunk" proofs, an open-games lobby, encrypted fleet backup, wagers, a 10×10 board.
