# Carve: pitch deck outline

Ten slides, about three minutes.

## 1. Carve
Sell exclusive rights. Keep your book private.
Exclusive licensing on Midnight.

## 2. Exclusivity is a promise nobody can check
- Licensed goods sold $389.8B at retail in 2025 (Licensing International, Global Licensing Industry Study 2026), and almost all of it is carved up by territory, category and time.
- A licensee pays for *"only you, in South Asia, in food and drink, until 2028"*.
- The licensor's deal book is confidential, so the licensee takes that on trust. Overlapping grants are found in court, after the launch.

## 3. Why it isn't solved
- **Spreadsheets and CRMs:** private, and unverifiable by anyone outside.
- **A public registry or blockchain:** verifiable, and it hands every competitor your client list and fees.
- **Lawyers and audits:** slow, expensive, and only after something goes wrong.

## 4. Carve: prove the book without showing it
- The book lives on the licensor's device. Only a commitment is on-chain.
- Every new grant comes with a **zero-knowledge proof** that it overlaps no exclusive grant in the whole book.
- An overlapping grant can't be issued: there is no proof for it.

## 5. Demo: the rights map
Regions down, categories across. Tap out a grant, and a clash shows before you prove. **Try anyway**: the contract refuses.

## 6. Three parties, three proofs
| | Proves | Keeps private |
|---|---|---|
| Licensor | no overlap with any exclusive grant, against the committed book | every grant, licensee and term |
| Licensee | "these are the terms I was issued, and I'm the one named" | identity, terms |
| Licensee to retailer | "I'm licensed for this region and category today" | everything else in the deal |

## 7. Built on Midnight
- Compact contract, 3 proven circuits: `issue`, `accept`, `prove_rights`.
- Private state: identity secret, the book (16 grants), held grants.
- The book commitment is Poseidon, so `issue` stays a 19 MB proving key. Grant commitments are SHA-256, checked by licensees off-chain.
- The constructor isn't proven, so the app reads the deploy transaction and shows **Started clean**.
- 28 simulator tests. Lace connector v4 with wallet-side proving. A CLI for scripted runs.

## 8. Who it's for
- **First:** independent licensing agencies and character IP studios (dozens to hundreds of grants per property), and the manufacturers who license from them.
- **Then:** music sync licensing, franchise territories, sports media rights, distribution agreements. Same shape: exclusive slices of a grid.
- **Revenue:** per-book subscription for licensors, and per-check fees for marketplaces that verify listings.

## 9. Roadmap
- **Wave 3:**
  - Merkle-tree books (hundreds of grants);
  - an encrypted book backup;
  - a property registry bound to the owner's credential.
- **Later:**
  - sublicensing proven to stay inside the parent grant;
  - royalty reports proven against the terms;
  - a marketplace integration for the check flow.

## 10. Carve
Exclusive rights you can prove, from a book nobody can read.
github.com/argenestel/carve
