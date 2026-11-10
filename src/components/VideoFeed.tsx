"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem, FeedResult } from "@/lib/queries";
import { VideoCard } from "./VideoCard";

type Props = {
  initial: FeedResult;
  query?: Record<string, string | undefined>;
  emptyTitle?: string;
  emptyHint?: string;
};

const GRID = "grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export function VideoFeed({ initial, query, emptyTitle = "这里还没有内容", emptyHint }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 查询条件固定成字符串，避免每次渲染都触发新的请求
  const baseQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return params.toString();
  }, [query]);

  const loadMore = useCallback(async () => {
    if (!cursor || status === "loading") return;
    setStatus("loading");
    try {
      const params = new URLSearchParams(baseQuery);
      params.set("cursor", cursor);
      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error("feed request failed");
      const data = (await res.json()) as FeedResult;
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [baseQuery, cursor, status]);

  // 触底预加载：哨兵进入视口下方 400px 即请求下一页
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !cursor || status === "error") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore, status]);

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink-soft">{emptyTitle}</p>
        <p className="mt-1.5 text-xs text-muted">{emptyHint ?? "换个关键词，或者先去投稿第一个视频。"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={GRID}>
        {items.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
        {status === "loading" &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`}>
              <div className="skeleton aspect-video w-full" />
              <div className="skeleton mt-3 h-4 w-4/5" />
              <div className="skeleton mt-2 h-3 w-1/2" />
            </div>
          ))}
      </div>

      <div ref={sentinelRef} className="h-8" aria-hidden="true" />

      {status === "error" && (
        <div className="py-6 text-center text-sm text-muted">
          加载失败，
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              void loadMore();
            }}
            className="ml-1 text-accent underline underline-offset-2"
          >
            点击重试
          </button>
        </div>
      )}

      {!cursor && status === "idle" && (
        <p className="py-6 text-center text-xs text-faint">已经到底了</p>
      )}
    </div>
  );
}
