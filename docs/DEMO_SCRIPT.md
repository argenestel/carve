# Video script (about 3 minutes, two browsers side by side)

Left: the **buyer** (Chrome profile A). Right: a **supplier** (Chrome profile B). Both run Lace on Preprod.

**0:00** "In a sealed-bid tender you trust the buyer twice: not to leak bids, and that the lowest one really won. Bidlock removes both, on Midnight."
**0:15** Buyer: **New tender** (ceiling €1.2M, short deadlines) → **Deploy**, approve in Lace. Copy the share link.
**0:40** Supplier: open the link → **Request to bid** → copy the request link to the buyer. "My secret stays in my browser. The buyer only gets a hash."
**0:55** Buyer: open the request link → **Qualify**. The supplier's page updates to *Your price*.
**1:10** Supplier: €940,000 → **Seal bid**, approve in Lace. "That proved I'm qualified, it's my only bid, and it's under the ceiling, without revealing who I am or my price." Flip to **Public view**: just a hash.
**1:40** After the deadline, supplier: **Reveal to buyer**. Buyer: the opening appears, readable only in the buyer's browser.
**2:05** After the reveal window, buyer: **Award**. "The buyer proves every counted opening matches its sealed bid and the winner is the lowest. Only the winning price goes public."
**2:25** Show the dispute path: a cut supplier gets **Prove it & dispute**, and the tender is stamped CONTESTED.
**2:40** Flash `bidlock.compact` (the `award` loop) and the 27 passing tests.
**2:55** "Public results, private prices. Bidlock."
