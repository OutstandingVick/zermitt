"use client";

/**
 * Real Google sign-in via Privy — identity only. No Privy wallet is created:
 * the NEAR key is still generated in the browser at claim time and every
 * on-chain step is relayer-signed. Loaded only when real login is enabled
 * (DEMO_MODE=false and NEXT_PUBLIC_PRIVY_APP_ID set).
 */
import { useEffect } from "react";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";

function GoogleButton({ onEmail }: { onEmail: (email: string) => void }) {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();

  useEffect(() => {
    if (!ready || !authenticated) return;
    const email = user?.google?.email ?? user?.email?.address;
    if (email) onEmail(email);
  }, [ready, authenticated, user, onEmail]);

  return (
    <button
      style={{ width: "100%", padding: 14, borderRadius: 8, fontSize: 16 }}
      disabled={!ready}
      onClick={() => login({ loginMethods: ["google"] })}
    >
      {ready ? "Continue with Google" : "Loading sign-in…"}
    </button>
  );
}

export default function PrivyGoogleLogin({
  appId,
  onEmail,
}: {
  appId: string;
  onEmail: (email: string) => void;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
      }}
    >
      <GoogleButton onEmail={onEmail} />
    </PrivyProvider>
  );
}
