"use client";

import Link from "next/link";
import { useState } from "react";
import { timeAgo } from "@/lib/format";

export type CommentNode = {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string; displayName: string };
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: { username: string; displayName: string };
  }>;
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
      {name.slice(0, 1)}
    </span>
  );
}

export function CommentSection({
  videoId,
  initial,
  canComment,
}: {
  videoId: string;
  initial: CommentNode[];
  canComment: boolean;
}) {
  const [items, setItems] = useState<CommentNode[]>(initial);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, content, parentId: replyTo?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "发送失败");
        return;
      }

      const created = data.item as {
        id: string;
        content: string;
        createdAt: string;
        user: { username: string; displayName: string };
      };

      if (replyTo) {
        setItems((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, { ...created, replies: undefined } as never] } : c,
          ),
        );
        setReplyTo(null);
      } else {
        setItems((prev) => [{ ...created, replies: [] }, ...prev]);
      }
      setText("");
    } catch {
      setError("网络异常，稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">评论 · {items.length === 0 ? "还没有评论" : `${items.length} 条`}</h2>

      {canComment ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface p-3">
          {replyTo && (
            <p className="mb-2 flex items-center gap-2 text-xs text-muted">
              回复 @{replyTo.name}
              <button type="button" className="text-accent" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="说点什么…"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{error || `${text.length}/500`}</span>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !text.trim()}
              className="h-8 rounded-full bg-ink px-4 text-xs text-white transition hover:bg-ink-soft disabled:opacity-40"
            >
              {busy ? "发送中" : "发布"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-5 text-center text-sm text-muted">
          <Link href={`/login?next=/watch/${videoId}`} className="text-accent underline underline-offset-2">
            登录
          </Link>
          后参与评论
        </div>
      )}

      <ul className="mt-5 space-y-5">
        {items.map((comment) => (
          <li key={comment.id}>
            <div className="flex gap-3">
              <Avatar name={comment.user.displayName} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-ink-soft">{comment.user.displayName}</span>
                  <span className="text-faint">{timeAgo(comment.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                  {comment.content}
                </p>
                {canComment && (
                  <button
                    type="button"
                    onClick={() => setReplyTo({ id: comment.id, name: comment.user.displayName })}
                    className="mt-1 text-xs text-muted hover:text-accent"
                  >
                    回复
                  </button>
                )}

                {comment.replies.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l border-line pl-3">
                    {comment.replies.map((reply) => (
                      <li key={reply.id} className="flex gap-2.5">
                        <Avatar name={reply.user.displayName} />
                        <div className="min-w-0">
                          <p className="flex items-baseline gap-2 text-xs">
                            <span className="font-medium text-ink-soft">{reply.user.displayName}</span>
                            <span className="text-faint">{timeAgo(reply.createdAt)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{reply.content}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
