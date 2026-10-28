"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useAnimationControls } from "motion/react";
import { Bell, BellOff } from "lucide-react";
import { getNotifications } from "@/lib/data";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "./session";

export function NotificationBell() {
  const { profile } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const controls = useAnimationControls();

  useEffect(() => {
    let live = true;
    getNotifications(profile.id).then((n) => {
      if (!live) return;
      setItems(n);
      // A small wiggle when unread notifications arrive (DESIGN.md §5).
      if (n.some((x) => !x.read)) controls.start({ rotate: [0, -14, 12, -8, 5, 0], transition: { duration: 0.6 } });
    });
    return () => {
      live = false;
    };
  }, [profile.id, controls]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <motion.span animate={controls} style={{ transformOrigin: "50% 10%" }} className="inline-flex">
          <Bell strokeWidth={1.75} />
        </motion.span>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-marigold px-1 font-mono text-[10px] leading-4 font-semibold text-ink"
          >
            {unread}
          </motion.span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">Notifications</DropdownMenuLabel>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-muted-foreground">
              <BellOff className="size-5" strokeWidth={1.75} aria-hidden="true" />
              You&apos;re all caught up.
            </div>
          ) : (
            items.map((n, i) => (
              <DropdownMenuItem
                key={n.id}
                render={<Link href={n.link ?? "#"} />}
                style={{ animationDelay: `${60 + i * 50}ms` }}
                className="flex items-start gap-2.5 px-2 py-2 [animation:item-in_280ms_var(--ease-out)_both] motion-reduce:animate-none"
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-marigold"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{n.title}</span>
                  <span className="block text-xs whitespace-normal text-muted-foreground">{n.body}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
