"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { transition } from "@/lib/motion";
import { CommandPalette } from "./command-palette";
import { JudgeGuide } from "./judge-guide";
import { RevealObserver } from "./reveal";
import { ThemeSync, useTheme } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <MotionConfig reducedMotion="user" transition={transition.enter}>
      <ThemeSync />
      <RevealObserver />
      {children}
      <CommandPalette />
      <JudgeGuide />
      <Toaster
        theme={theme}
        position="bottom-center"
        closeButton
        toastOptions={{
          className: "font-sans !rounded-xl !border-line !bg-popover !text-popover-foreground !shadow-pop",
          classNames: {
            description: "!text-muted-foreground",
            success: "[&_[data-icon]]:!text-success",
            error: "[&_[data-icon]]:!text-danger",
          },
        }}
      />
    </MotionConfig>
  );
}
