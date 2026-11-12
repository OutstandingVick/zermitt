/**
 * Spike 3 — claim link on testnet via the NEP-452 linkdrop contract
 * deployed at the `testnet` top-level account.
 *
 * Flow:
 *   1. Funder calls `send(public_key)` on `testnet` with an attached deposit,
 *      registering a claim key. The private key IS the claim link.
 *   2. Anyone holding that key calls `create_account_and_claim` signed as
 *      `testnet` with the claim key — creating a brand-new account that
 *      receives the funds, paying no gas of their own.
 *
 * Requires RELAYER_ACCOUNT_ID / RELAYER_PRIVATE_KEY in .env (a funded
 * testnet account). Prints both transaction hashes.
 */
import { KeyPair, utils } from "near-api-js";
import { loadConfig, requireRelayer } from "../../lib/config";
import { connectNear, txLink } from "../../lib/near/client";

const LINKDROP_CONTRACT = "testnet";

async function main() {
  const config = loadConfig();
  if (config.networkId !== "testnet") throw new Error("Spike 3 runs on testnet only.");
  const relayer = requireRelayer(config);

  const near = await connectNear(config, {
    accountId: relayer.accountId,
    privateKey: relayer.privateKey,
  });
  const funder = await near.account(relayer.accountId);

  // 1. Fund the claim link.
  const claimKey = KeyPair.fromRandom("ed25519");
  // The linkdrop contract requires the deposit to exceed its 1-NEAR
  // ACCESS_KEY_ALLOWANCE (gas allowance for the claim call).
  const amount = utils.format.parseNearAmount("1.5")!;
  console.log(`Funding claim link from ${relayer.accountId} with 1.5 NEAR...`);
  const sendResult = await funder.functionCall({
    contractId: LINKDROP_CONTRACT,
    methodName: "send",
    args: { public_key: claimKey.getPublicKey().toString() },
    gas: BigInt("50000000000000"),
    attachedDeposit: BigInt(amount),
  });
  const sendHash = sendResult.transaction.hash as string;
  console.log(`  send tx: ${txLink(config.networkId, sendHash)}`);
  console.log(`  claim link (testnet wallet format):`);
  console.log(`  https://testnet.mynearwallet.com/linkdrop/${LINKDROP_CONTRACT}/${claimKey.toString()}`);

  // 2. Claim into a newly created account, signing as `testnet` with the claim key.
  const newAccountId = `zermitt-claim-${Date.now()}.testnet`;
  const newAccountKey = KeyPair.fromRandom("ed25519");
  const keyStore = (near.connection.signer as unknown as { keyStore: { setKey: Function } }).keyStore;
  await keyStore.setKey(config.networkId, LINKDROP_CONTRACT, claimKey);
  const claimer = await near.account(LINKDROP_CONTRACT);

  console.log(`\nClaiming into new account ${newAccountId}...`);
  const claimResult = await claimer.functionCall({
    contractId: LINKDROP_CONTRACT,
    methodName: "create_account_and_claim",
    args: {
      new_account_id: newAccountId,
      new_public_key: newAccountKey.getPublicKey().toString(),
    },
    gas: BigInt("100000000000000"),
  });
  const claimHash = claimResult.transaction.hash as string;
  console.log(`  claim tx: ${txLink(config.networkId, claimHash)}`);

  console.log(`\nSpike 3 complete.`);
  console.log(`  funded:  ${sendHash}`);
  console.log(`  claimed: ${claimHash} → ${newAccountId}`);
}

main().catch((err) => {
  console.error("Spike 3 failed:", err);
  process.exit(1);
});
