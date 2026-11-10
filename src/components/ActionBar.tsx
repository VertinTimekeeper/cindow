"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCount } from "@/lib/format";

type Action = { key: string; label: string; count: number };

export function ActionBar({
  videoId,
  likeCount,
  coinCount,
  favoriteCount,
  isLoggedIn,
}: {
  videoId: string;
  likeCount: number;
  coinCount: number;
  favoriteCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [hint, setHint] = useState("");

  const actions: Action[] = [
    { key: "like", label: "点赞", count: likeCount },
    { key: "coin", label: "投币", count: coinCount },
    { key: "favorite", label: "收藏", count: favoriteCount },
  ];

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=/watch/${videoId}`);
      return;
    }
    setHint("互动接口在二期接入，当前仅展示计数");
    window.setTimeout(() => setHint(""), 2500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={handleClick}
          title={isLoggedIn ? "骨架阶段占位" : "登录后可用"}
          className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <span>{a.label}</span>
          <span className="tabular-nums text-xs text-muted">{formatCount(a.count)}</span>
        </button>
      ))}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
