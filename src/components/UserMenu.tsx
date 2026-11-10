"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    setBusy(false);
    router.refresh();
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink transition hover:border-line-strong"
        title={user.displayName}
      >
        {user.displayName.slice(0, 1)}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg shadow-black/5"
          >
            <div className="border-b border-line px-3 py-2">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
            <Link
              href={`/u/${user.username}`}
              className="block px-3 py-2 text-sm text-ink-soft hover:bg-paper"
              onClick={() => setOpen(false)}
            >
              个人主页
            </Link>
            <Link
              href="/studio"
              className="block px-3 py-2 text-sm text-ink-soft hover:bg-paper"
              onClick={() => setOpen(false)}
            >
              创作中心
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-paper disabled:opacity-50"
            >
              {busy ? "退出中…" : "退出登录"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
