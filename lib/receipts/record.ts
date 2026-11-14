/**
 * Record a claimed transfer's receipt in the receipts contract and read
 * receipts back (reads are keyless view calls).
 */
import { loadConfig, requireRelayer, type ZermittConfig } from "../config";
import { connectNear, txLink } from "../near/client";
import { updateTransfer, type TransferRecord } from "../transfers/store";
import { buildReceiptMeta, hashReceiptMeta, type ReceiptMeta } from "./hash";

/** v2 (optional agent-proof fields) is written to; v1 is kept for old receipts. */
export const RECEIPTS_CONTRACT = process.env.RECEIPTS_CONTRACT ?? "receipts-v2.zermitt.testnet";
export const RECEIPTS_CONTRACT_V1 = process.env.RECEIPTS_CONTRACT_V1 ?? "receipts.zermitt.testnet";

export type OnChainReceipt = {
  transfer_id: string;
  receipt_hash: string;
  meta: ReceiptMeta;
  recorded_at_ms: number;
};

export async function recordReceipt(
  transfer: TransferRecord,
  config: ZermittConfig = loadConfig()
): Promise<{ receiptTxHash: string; receiptTxUrl: string; hash: string }> {
  if (transfer.status !== "claimed")
    throw new Error("Only claimed transfers can produce a receipt.");
  const relayer = requireRelayer(config);
  const meta = buildReceiptMeta(transfer);
  const hash = await hashReceiptMeta(meta);

  const near = await connectNear(config, {
    accountId: relayer.accountId,
    privateKey: relayer.privateKey,
  });
  const account = await near.account(relayer.accountId);
  const res = await account.functionCall({
    contractId: RECEIPTS_CONTRACT,
    methodName: "record_receipt",
    args: { transfer_id: transfer.id, receipt_hash: hash, metadata: meta },
    gas: BigInt("50000000000000"),
  });
  const receiptTxHash = res.transaction.hash as string;
  await updateTransfer(transfer.id, {
    transactions: { ...transfer.transactions, receiptTxHash },
  });
  return { receiptTxHash, receiptTxUrl: txLink(config.networkId, receiptTxHash), hash };
}

/** Keyless view read: tries the v2 contract, then falls back to v1. */
export async function readReceipt(
  transferId: string,
  nodeUrl = "https://rpc.testnet.near.org"
): Promise<OnChainReceipt | null> {
  const v2 = await readReceiptFrom(RECEIPTS_CONTRACT, transferId, nodeUrl);
  if (v2) return v2;
  return readReceiptFrom(RECEIPTS_CONTRACT_V1, transferId, nodeUrl);
}

export async function readReceiptFrom(
  contractId: string,
  transferId: string,
  nodeUrl = "https://rpc.testnet.near.org"
): Promise<OnChainReceipt | null> {
  const res = await fetch(nodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: "get_receipt",
        args_base64: Buffer.from(JSON.stringify({ transfer_id: transferId })).toString("base64"),
      },
    }),
  });
  const data = (await res.json()) as { result?: { result: number[] }; error?: unknown };
  if (!data.result) throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  return JSON.parse(Buffer.from(data.result.result).toString()) as OnChainReceipt | null;
}
