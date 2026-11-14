"use client";

import { useState } from "react";

export function DemoNotice() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="notice" role="status">
      <span>Testnet demo · real quotes, mocked swap execution</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss testnet notice">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
