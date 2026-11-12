/**
 * Named sub-account validation under zermitt.testnet.
 * NEAR account rules: lowercase a-z, 0-9, separators - and _ (not leading,
 * trailing, or doubled); whole account id max 64 chars.
 */

export const PARENT_ACCOUNT = process.env.ZERMITT_PARENT ?? "zermitt.testnet";

const RESERVED = new Set([
  "zermitt", "admin", "root", "relayer", "www", "api", "app", "wallet",
  "support", "help", "official", "system", "near", "testnet",
]);

export type NameCheck = { ok: true; accountId: string } | { ok: false; reason: string };

export function validateName(name: string): NameCheck {
  const n = name.trim().toLowerCase();
  if (n.length < 2) return { ok: false, reason: "Name must be at least 2 characters." };
  const accountId = `${n}.${PARENT_ACCOUNT}`;
  if (accountId.length > 64) return { ok: false, reason: "Name is too long." };
  if (!/^[a-z0-9]+([-_][a-z0-9]+)*$/.test(n))
    return {
      ok: false,
      reason: "Only lowercase letters, numbers, and single - or _ between them.",
    };
  if (RESERVED.has(n)) return { ok: false, reason: `"${n}" is reserved.` };
  return { ok: true, accountId };
}

/** Suggest a claimable name from the sender's alias ("uncle joe" → "uncle-joe"). */
export function suggestName(alias: string): string {
  const base = alias.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length >= 2 ? base : `friend-${base}`;
}
