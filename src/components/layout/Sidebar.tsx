"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Home, CreditCard, TrendingUp, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/format";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/chat", label: "Chat", icon: MessageCircle },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const name = user?.fullName ?? user?.firstName ?? "User";

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-60 border-r border-border bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-bold tracking-tight text-primary">penny-wise</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getAvatarColor(name) }}
          >
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
