"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const ensureProfile = useMutation(api.profiles.ensureProfile);
  const seedCategories = useMutation(api.categories.seedSystemCategories);
  const accounts = useQuery(api.accounts.list);
  const router = useRouter();
  const seededCategoriesRef = useRef(false);
  const ensuredProfileRef = useRef(false);

  // Seed global categories once after auth state is ready.
  useEffect(() => {
    if (!isLoaded || seededCategoriesRef.current) return;

    seededCategoriesRef.current = true;
    seedCategories({}).catch((error) => {
      seededCategoriesRef.current = false;
      console.error(error);
    });
  }, [isLoaded, seedCategories]);

  // Ensure the signed-in user has a profile only after Clerk auth is ready.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || ensuredProfileRef.current) return;

    ensuredProfileRef.current = true;
    ensureProfile({}).catch((error) => {
      ensuredProfileRef.current = false;
      console.error(error);
    });
  }, [ensureProfile, isLoaded, isSignedIn]);

  // Onboarding gate: redirect to /onboarding if no accounts yet
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    if (accounts !== undefined && accounts.length === 0) {
      const path = window.location.pathname;
      if (path !== "/onboarding") {
        router.push("/onboarding");
      }
    }
  }, [accounts, isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center justify-center px-6">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-10 w-10 animate-pulse rounded-full bg-primary/15" />
            <p className="text-sm font-medium">Checking your session…</p>
            <p className="text-sm text-muted-foreground">
              We’re getting your workspace ready.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center justify-center px-6">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Private Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to open penny-wise
            </h1>
            <p className="text-sm text-muted-foreground">
              Your finances stay behind authentication. Sign in to load your dashboard, transactions, and settings.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar />
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:pl-60">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
