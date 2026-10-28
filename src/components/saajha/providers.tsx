"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { EASE } from "./page-transition";
import { ThemeSync, useTheme } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: EASE }}>
      <ThemeSync />
      {children}
      <Toaster theme={theme} position="bottom-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
    </MotionConfig>
  );
}
