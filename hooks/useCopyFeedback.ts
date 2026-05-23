"use client";

import { useCallback, useState } from "react";

export function useCopyFeedback(timeoutMs = 2000) {
  const [message, setMessage] = useState<string | null>(null);

  const copyText = useCallback(
    async (text: string, label: string) => {
      await navigator.clipboard.writeText(text);
      setMessage(label);
      window.setTimeout(() => setMessage(null), timeoutMs);
    },
    [timeoutMs],
  );

  return { copyMessage: message, copyText, clearCopyMessage: () => setMessage(null) };
}
