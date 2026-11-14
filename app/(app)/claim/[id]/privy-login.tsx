"use client";

/**
 * Real Google sign-in via Privy — identity only. No Privy wallet is created:
 * the NEAR key is still generated in the browser at claim time and every
 * on-chain step is relayer-signed. Loaded only when real login is enabled
 * (DEMO_MODE=false and NEXT_PUBLIC_PRIVY_APP_ID set).
 */
import { useEffect } from "react";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { Icon } from "../../ui";

type Props = {
  /** Fires whenever a signed-in Google identity is available. */
  onEmail: (email: string) => void;
  /** Called on click, before the Google redirect (save the name and intent). */
  onStart: () => void;
  disabled?: boolean;
};

function GoogleButton({ onEmail, onStart, disabled }: Props) {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();

  useEffect(() => {
    if (!ready || !authenticated) return;
    const email = user?.google?.email ?? user?.email?.address;
    if (email) onEmail(email);
  }, [ready, authenticated, user, onEmail]);

  return (
    <button
      type="button"
      className="z-btn z-btn-light"
      disabled={!ready || disabled}
      onClick={() => {
        onStart();
        if (!authenticated) login({ loginMethods: ["google"] });
      }}
    >
      <Icon name="google" />
      {ready ? "Continue with Google" : "Loading sign-in…"}
    </button>
  );
}

export default function PrivyGoogleLogin({ appId, ...props }: Props & { appId: string }) {
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
      <GoogleButton {...props} />
    </PrivyProvider>
  );
}
