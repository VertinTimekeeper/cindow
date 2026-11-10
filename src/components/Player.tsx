"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

export type PlayerSource = { id: string; label: string; url: string; height: number };
export type DanmakuItem = {
  id: string;
  content: string;
  timeSec: number;
  color: string;
  mode: string;
  fontSize: number;
};

const LANE_HEIGHT = 34;
const MAX_LANES = 5;
const SCROLL_SPEED = 110; // px / 秒

export function Player({
  videoId,
  sources,
  coverUrl,
  initialDanmaku,
  canSendDanmaku,
}: {
  videoId: string;
  sources: PlayerSource[];
  coverUrl: string | null;
  initialDanmaku: DanmakuItem[];
  canSendDanmaku: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<DanmakuItem[]>(initialDanmaku);
  const cursorRef = useRef(0);
  const animsRef = useRef<Set<Animation>>(new Set());
  const laneRef = useRef(0);
  const restoredRef = useRef(false);
  const pendingSeekRef = useRef<{ time: number; resume: boolean } | null>(null);

  const [current, setCurrent] = useState<PlayerSource | undefined>(sources[0]);
  const [danmakuOn, setDanmakuOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  const progressKey = `cindow:progress:${videoId}`;

  useEffect(() => {
    itemsRef.current = initialDanmaku;
    cursorRef.current = 0;
  }, [initialDanmaku]);

  // ---------- 播放进度记忆（本地）----------
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let lastSaved = 0;
    const save = () => {
      try {
        localStorage.setItem(progressKey, String(Math.floor(el.currentTime)));
      } catch {
        /* 隐私模式下忽略 */
      }
    };
    const onTimeUpdate = () => {
      if (Math.abs(el.currentTime - lastSaved) >= 5) {
        lastSaved = el.currentTime;
        save();
      }
    };
    const onLoadedMetadata = () => {
      if (restoredRef.current || Number.isNaN(el.duration)) return;
      restoredRef.current = true;
      try {
        const saved = Number(localStorage.getItem(progressKey) ?? 0);
        if (saved > 5 && saved < el.duration - 8) {
          el.currentTime = saved;
          setRestoredAt(saved);
          window.setTimeout(() => setRestoredAt(null), 5000);
        }
      } catch {
        /* 忽略 */
      }
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("pause", save);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("pause", save);
    };
  }, [progressKey]);

  // ---------- 切换清晰度：保持时间点 ----------
  useEffect(() => {
    const el = videoRef.current;
    const pending = pendingSeekRef.current;
    if (!el || !pending) return;

    const handler = () => {
      el.currentTime = Math.min(pending.time, Math.max(0, el.duration - 0.5));
      if (pending.resume) void el.play().catch(() => {});
      el.removeEventListener("loadedmetadata", handler);
      pendingSeekRef.current = null;
    };
    el.addEventListener("loadedmetadata", handler);
    return () => el.removeEventListener("loadedmetadata", handler);
  }, [current?.id]);

  function switchQuality(next: PlayerSource) {
    const el = videoRef.current;
    if (!el || next.id === current?.id) return;
    pendingSeekRef.current = { time: el.currentTime, resume: !el.paused };
    setCurrent(next);
  }

  // ---------- 弹幕 ----------
  const spawn = useCallback((item: DanmakuItem) => {
    const layer = layerRef.current;
    if (!layer) return;

    const span = document.createElement("span");
    span.className = "danmaku-item";
    span.textContent = item.content;
    span.style.color = item.color;
    span.style.fontSize = `${item.fontSize || 24}px`;
    span.style.top = `${laneRef.current * LANE_HEIGHT + 10}px`;
    span.style.left = "0";
    layer.appendChild(span);
    laneRef.current = (laneRef.current + 1) % MAX_LANES;

    const width = span.offsetWidth;
    const containerWidth = layer.clientWidth;
    const duration = ((containerWidth + width) / SCROLL_SPEED) * 1000;
    const animation = span.animate(
      [
        { transform: `translateX(${containerWidth}px)` },
        { transform: `translateX(-${width}px)` },
      ],
      { duration, easing: "linear" },
    );
    animation.pause();
    if (!videoRef.current?.paused) animation.play();
    animation.onfinish = () => {
      span.remove();
      animsRef.current.delete(animation);
    };
    animsRef.current.add(animation);
  }, []);

  const clearDanmaku = useCallback(() => {
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current.clear();
    layerRef.current?.replaceChildren();
  }, []);

  // 播放中每 150ms 扫一次时间轴，把该出现的弹幕推上屏
  useEffect(() => {
    if (!danmakuOn) {
      clearDanmaku();
      return;
    }
    const timer = window.setInterval(() => {
      const el = videoRef.current;
      if (!el || el.paused) return;
      const list = itemsRef.current;
      while (cursorRef.current < list.length && list[cursorRef.current].timeSec <= el.currentTime) {
        spawn(list[cursorRef.current]);
        cursorRef.current += 1;
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [danmakuOn, clearDanmaku, spawn]);

  useEffect(() => {
    animsRef.current.forEach((a) => (playing ? a.play() : a.pause()));
  }, [playing]);

  function handleSeeking() {
    const el = videoRef.current;
    if (!el) return;
    clearDanmaku();
    const list = itemsRef.current;
    const index = list.findIndex((d) => d.timeSec >= el.currentTime);
    cursorRef.current = index < 0 ? list.length : index;
  }

  async function sendDanmaku(e: React.FormEvent) {
    e.preventDefault();
    const el = videoRef.current;
    const content = text.trim();
    if (!content || !el) return;

    setSending(true);
    try {
      const res = await fetch("/api/danmaku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, content, timeSec: el.currentTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "发送失败");
      } else {
        const item = data.item as DanmakuItem;
        const next = [...itemsRef.current, item].sort((a, b) => a.timeSec - b.timeSec);
        itemsRef.current = next;
        setText("");
        setNotice("弹幕已发送");
        if (!el.paused) {
          spawn(item);
          cursorRef.current = next.findIndex((d) => d.timeSec >= el.currentTime);
          if (cursorRef.current < 0) cursorRef.current = next.length;
        }
      }
    } catch {
      setNotice("网络异常，稍后再试");
    } finally {
      setSending(false);
      window.setTimeout(() => setNotice(""), 2500);
    }
  }

  if (!current) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-card)] bg-ink text-sm text-white/70">
        该视频还没有可播放的转码产物
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-black">
        <video
          ref={videoRef}
          src={current.url}
          poster={coverUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onSeeking={handleSeeking}
        />

        {danmakuOn && (
          <div
            ref={layerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[70%] overflow-hidden"
          />
        )}

        {restoredAt !== null && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            已从 {formatDuration(restoredAt)} 继续播放
          </div>
        )}

        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDanmakuOn((v) => !v)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              danmakuOn ? "bg-white/85 text-ink" : "bg-black/55 text-white/80 hover:bg-black/70"
            }`}
            title="弹幕开关"
          >
            {danmakuOn ? "弹幕 开" : "弹幕 关"}
          </button>
          {sources.length > 1 && (
            <select
              value={current.id}
              onChange={(e) => {
                const next = sources.find((s) => s.id === e.target.value);
                if (next) switchQuality(next);
              }}
              aria-label="清晰度"
              className="rounded-full bg-black/55 px-2 py-1 text-xs text-white outline-none hover:bg-black/70"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <form onSubmit={sendDanmaku} className="mt-2.5 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={50}
          disabled={!canSendDanmaku}
          placeholder={canSendDanmaku ? "发一条弹幕，回车发送" : "登录后可发送弹幕"}
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 text-sm outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:bg-paper disabled:text-faint"
        />
        {canSendDanmaku ? (
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm text-white transition hover:bg-ink-soft disabled:opacity-40"
          >
            {sending ? "发送中" : "发送"}
          </button>
        ) : (
          <Link
            href={`/login?next=/watch/${videoId}`}
            className="flex h-9 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-soft hover:border-line-strong"
          >
            登录
          </Link>
        )}
        {notice && <span className="shrink-0 text-xs text-muted">{notice}</span>}
      </form>
    </div>
  );
}
