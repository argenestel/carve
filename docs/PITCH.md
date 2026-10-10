# Bidlock: deck outline (8 slides)

1. **Bidlock.** Sealed-bid tenders where the buyer proves the award was fair, and losing prices are never revealed.
2. **Problem.** Leaked bids, rigged awards, and price exposure that helps cartels. Transparency and confidentiality usually trade off.
3. **Insight.** With Midnight's public/private split, the *result* can be public while the *prices* stay private.
4. **Flow.** Qualify → Bid (ZK: qualified, ≤ ceiling, one each) → Reveal to buyer → Award (ZK: lowest counted bid) → Dispute.
5. **Live on Preprod.** Buyer and supplier in two browsers with Lace: deploy, qualify, seal, reveal, award; Public view shows only hashes.
6. **Under the hood.** 7 circuits, an 8-slot award proof, tender-bound commitments, 27 passing tests, Compact 0.31.1, preprod CLI.
7. **Market.** Public buyers (municipalities, utilities, transport) and the platforms that run their e-procurement. Start with below-threshold municipal tenders.
8. **Next.** Lace in the frontend, price/quality (MEAT) scoring, garbage-envelope rebuttal, multi-lot tenders, a pilot with a municipality.
