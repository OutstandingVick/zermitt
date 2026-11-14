"use client";

/**
 * Spike 2 test page — social login.
 * See scripts/spikes/02-social-login.md for the research and findings.
 *
 * Phase 0 ships the mocked path (DEMO_MODE default) so judges need no real
 * Google account or Privy app ID. The real Privy integration is Phase 2.
 */
import { useState } from "react";

type MockUser = { email: string; nearAccountId: string };

export default function SpikeLogin() {
  const [user, setUser] = useState<MockUser | null>(null);

  function mockGoogleLogin() {
    // Mirrors what the real flow produces: an email identity mapped to a
    // named sub-account under zermitt.testnet.
    const email = "demo.judge@example.com";
    const alias = email.split("@")[0].replace(/[^a-z0-9]/g, "-");
    setUser({ email, nearAccountId: `${alias}.zermitt.testnet` });
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>Spike 2: social login</h1>
      <p>
        Mocked Google login (DEMO_MODE). The production path uses Privy —
        findings in <code>scripts/spikes/02-social-login.md</code>.
      </p>
      {user ? (
        <div>
          <p>✅ Signed in as <strong>{user.email}</strong></p>
          <p>NEAR account: <code>{user.nearAccountId}</code></p>
          <button onClick={() => setUser(null)}>Sign out</button>
        </div>
      ) : (
        <button onClick={mockGoogleLogin} style={{ padding: "0.5rem 1rem" }}>
          Continue with Google (mock)
        </button>
      )}
    </main>
  );
}
