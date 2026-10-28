"use client";

import { useState } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

/** Failed load: says what happened in plain words and offers a retry. */
export function ErrorState({ title, onRetry }: { title: string; onRetry: () => Promise<unknown> | void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div role="alert">
      <EmptyState
        icon={CloudOff}
        title={title}
        body="This is usually a brief network hiccup. Your data is safe; try again in a moment."
        action={
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRetry();
              } finally {
                setBusy(false);
              }
            }}
          >
            Try again
          </Button>
        }
      />
    </div>
  );
}
