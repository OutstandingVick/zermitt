export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>Zermitt</h1>
      <p>
        AI remittance agent on NEAR. Type <em>&ldquo;send $50 to mum&rdquo;</em> — Zermitt routes
        funds from any asset or chain into USDC on NEAR via NEAR Intents and sends a claim link.
      </p>
      <p>
        <strong>Phase 0:</strong> project scaffold and integration spikes. The send and receive
        flows are on the roadmap — see the README features table.
      </p>
    </main>
  );
}
