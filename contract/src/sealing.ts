// SPDX-License-Identifier: Apache-2.0
//
// Sealing bid openings to the buyer (X25519 + XSalsa20-Poly1305, tweetnacl).
// Each envelope uses a fresh ephemeral key, so two envelopes from the same
// supplier can't be linked. Plaintext is padded so its length leaks nothing.

import nacl from "tweetnacl";
import type { Opening } from "./managed/bidlock/contract/index.js";

export const toB64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
export const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string): Uint8Array => {
  const clean = h.trim().replace(/^0x/, "");
  if (!/^([0-9a-fA-F]{2})*$/.test(clean)) throw new Error("Not a hex string");
  return Uint8Array.from(clean.match(/../g) ?? [], (x) => parseInt(x, 16));
};

export type BoxKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export const newBoxKeys = (): BoxKeyPair => nacl.box.keyPair();
export const randomSecret = (): Uint8Array => nacl.randomBytes(32);

const BUCKET = 256;
const pad = (msg: Uint8Array) => {
  const size = Math.ceil((msg.length + 4) / BUCKET) * BUCKET;
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, msg.length);
  out.set(msg, 4);
  out.set(nacl.randomBytes(size - 4 - msg.length), 4 + msg.length);
  return out;
};
const unpad = (p: Uint8Array) => p.slice(4, 4 + new DataView(p.buffer, p.byteOffset).getUint32(0));

/** What a bidder tells the buyer at reveal time. */
export type SealedPayload = { amount: string; salt: string; company: string };

export const sealOpening = (o: Opening, company: string, buyerPub: Uint8Array): string => {
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const body: SealedPayload = { amount: o.amount.toString(), salt: toHex(o.salt), company };
  const box = nacl.box(pad(new TextEncoder().encode(JSON.stringify(body))), nonce, buyerPub, eph.secretKey);
  return ["bidlock1", toB64(eph.publicKey), toB64(nonce), toB64(box)].join(".");
};

export const openSealed = (sealed: string, buyer: BoxKeyPair): { opening: Opening; company: string } | null => {
  try {
    const [tag, pub, nonce, box] = sealed.split(".");
    if (tag !== "bidlock1") return null;
    const plain = nacl.box.open(fromB64(box), fromB64(nonce), fromB64(pub), buyer.secretKey);
    if (!plain) return null;
    const p = JSON.parse(new TextDecoder().decode(unpad(plain))) as SealedPayload;
    return { opening: { amount: BigInt(p.amount), salt: fromHex(p.salt) }, company: p.company };
  } catch {
    return null;
  }
};
