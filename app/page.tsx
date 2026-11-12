export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>Zermitt</h1>
      <p>
        AI remittance agent on NEAR. Type <em>&ldquo;send $50 to mum&rdquo;</em> — Zermitt routes
        funds from any asset or chain into USDC on NEAR via NEAR Intents and sends a claim link.
      </p>
      <p>
        <a href="/send">→ Try the send flow</a>
      </p>
      <p>
        <strong>Phase 1:</strong> chat-to-send with real quotes and testnet claim links. Swap
        execution is mocked in demo mode — see the README features table.
      </p>
    </main>
  );
}
