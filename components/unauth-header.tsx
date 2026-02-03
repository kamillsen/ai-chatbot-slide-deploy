"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * Oturum yokken sağ üstte "Sign in" ve "Sign up" butonlarını gösterir.
 * Oturum varken hiçbir şey render etmez.
 */
export function UnauthHeader() {
  const { data, status } = useSession();

  if (status === "loading" || data?.user) {
    return null;
  }

  return (
    <header
      className="flex shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-4 py-2"
      role="banner"
    >
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/register">Sign up</Link>
      </Button>
    </header>
  );
}
