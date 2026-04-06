"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { getInitials, getAvatarColor } from "@/lib/format";

export function Header() {
  const { user } = useUser();
  const name = user?.fullName ?? user?.firstName ?? undefined;
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-background border-b border-border">
      <span className="text-lg font-bold text-primary tracking-tight">
        penny-wise
      </span>
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
        <Link href="/settings" aria-label="Profile">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white select-none"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
