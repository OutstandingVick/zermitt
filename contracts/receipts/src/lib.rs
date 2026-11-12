//! Zermitt receipts: an append-only public record of transfers.
//! Anyone can read; only the owner (zermitt.testnet) can record.

use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, PanicOnDefault};

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ReceiptMeta {
    /// How the sender addressed the recipient, e.g. "mum" (no PII beyond the alias).
    pub sender_label: String,
    pub recipient_account: String,
    /// USDC amount in raw 6-decimal units, e.g. "4992688" = 4.992688 USDC.
    pub amount_usdc: String,
    /// Fee in USD as a decimal string.
    pub fee_usd: String,
    /// e.g. "USDT→USDC via NEAR Intents (1Click), claim on NEAR testnet".
    pub route_summary: String,
    /// "mocked" (DEMO_MODE) or "live".
    pub swap_mode: String,
    /// All related transaction hashes (fund, create, claim, storage, payout).
    pub tx_hashes: Vec<String>,
    /// ISO-8601 timestamp of the transfer.
    pub timestamp: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Receipt {
    pub transfer_id: String,
    /// sha256 (hex) of the canonical transfer JSON — recomputable by anyone.
    pub receipt_hash: String,
    pub meta: ReceiptMeta,
    /// Block timestamp (ms) when recorded on-chain.
    pub recorded_at_ms: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Receipts {
    owner: AccountId,
    receipts: IterableMap<String, Receipt>,
}

#[near]
impl Receipts {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            receipts: IterableMap::new(b"r"),
        }
    }

    /// Record a receipt. Owner-only; duplicate transfer_ids are rejected.
    pub fn record_receipt(&mut self, transfer_id: String, receipt_hash: String, metadata: ReceiptMeta) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can record receipts"
        );
        assert!(
            !self.receipts.contains_key(&transfer_id),
            "Receipt already recorded for this transfer_id"
        );
        let receipt = Receipt {
            transfer_id: transfer_id.clone(),
            receipt_hash,
            meta: metadata,
            recorded_at_ms: env::block_timestamp_ms(),
        };
        self.receipts.insert(transfer_id, receipt);
    }

    pub fn get_receipt(&self, transfer_id: String) -> Option<Receipt> {
        self.receipts.get(&transfer_id).cloned()
    }

    /// Paged read in insertion order.
    pub fn get_receipts(&self, from_index: u32, limit: u32) -> Vec<Receipt> {
        self.receipts
            .values()
            .skip(from_index as usize)
            .take(limit as usize)
            .cloned()
            .collect()
    }

    pub fn total_receipts(&self) -> u32 {
        self.receipts.len()
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn meta() -> ReceiptMeta {
        ReceiptMeta {
            sender_label: "mum".into(),
            recipient_account: "mum.zermitt.testnet".into(),
            amount_usdc: "4992688".into(),
            fee_usd: "0.0044".into(),
            route_summary: "USDT→USDC via NEAR Intents (1Click)".into(),
            swap_mode: "mocked".into(),
            tx_hashes: vec!["abc".into(), "def".into()],
            timestamp: "2026-11-12T10:00:00.000Z".into(),
        }
    }

    fn ctx(predecessor: AccountId) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(predecessor)
            .build());
    }

    #[test]
    fn owner_can_record_and_read() {
        ctx(accounts(0));
        let mut c = Receipts::new(accounts(0));
        c.record_receipt("t1".into(), "hash1".into(), meta());
        assert_eq!(c.total_receipts(), 1);
        let r = c.get_receipt("t1".into()).unwrap();
        assert_eq!(r.receipt_hash, "hash1");
        assert_eq!(r.meta, meta());
        assert_eq!(c.get_receipts(0, 10).len(), 1);
        assert!(c.get_receipt("missing".into()).is_none());
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn non_owner_cannot_record() {
        ctx(accounts(0));
        let mut c = Receipts::new(accounts(0));
        ctx(accounts(1));
        c.record_receipt("t1".into(), "hash1".into(), meta());
    }

    #[test]
    #[should_panic(expected = "already recorded")]
    fn duplicates_rejected() {
        ctx(accounts(0));
        let mut c = Receipts::new(accounts(0));
        c.record_receipt("t1".into(), "hash1".into(), meta());
        c.record_receipt("t1".into(), "hash2".into(), meta());
    }

    #[test]
    fn paging_works() {
        ctx(accounts(0));
        let mut c = Receipts::new(accounts(0));
        for i in 0..5 {
            c.record_receipt(format!("t{i}"), format!("h{i}"), meta());
        }
        assert_eq!(c.total_receipts(), 5);
        let page = c.get_receipts(2, 2);
        assert_eq!(page.len(), 2);
        assert_eq!(page[0].transfer_id, "t2");
        assert_eq!(page[1].transfer_id, "t3");
    }
}
