import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFeed, getVideoDetail } from "@/lib/queries";
import { Player } from "@/components/Player";
import { ActionBar } from "@/components/ActionBar";
import { CommentSection } from "@/components/CommentSection";
import { VideoCard } from "@/components/VideoCard";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoDetail(id);
  return { title: video ? video.title : "视频不存在" };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const video = await getVideoDetail(id);
  if (!video) notFound();

  const isOwner = viewer?.id === video.authorId;
  const isAdmin = viewer?.role === "admin";
  if (video.status !== "published" && !isOwner && !isAdmin) notFound();

  const [danmaku, comments, related] = await Promise.all([
    prisma.danmaku.findMany({
      where: { videoId: id },
      orderBy: { timeSec: "asc" },
      take: 2000,
      select: { id: true, content: true, timeSec: true, color: true, mode: true, fontSize: true },
    }),
    prisma.comment.findMany({
      where: { videoId: id, parentId: null, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { username: true, displayName: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { username: true, displayName: true } } },
        },
      },
    }),
    getFeed({ category: video.category?.slug, limit: 8 }),
  ]);

  if (video.status === "published") {
    await prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }

  const commentNodes = comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  }));

  const relatedItems = related.items.filter((v) => v.id !== id).slice(0, 6);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Player
            videoId={video.id}
            sources={video.sources.map((s) => ({ id: s.id, label: s.label, url: s.url, height: s.height }))}
            coverUrl={video.coverUrl}
            initialDanmaku={danmaku}
            canSendDanmaku={Boolean(viewer)}
          />

          {video.status !== "published" && (
            <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
              {video.status === "processing" && "该稿件正在转码，目前只有你自己可见。"}
              {video.status === "rejected" && "该稿件未通过审核，仅作者与管理员可见。"}
              {video.status === "draft" && "草稿状态，仅你自己可见。"}
            </div>
          )}

          <h1 className="mt-4 text-xl font-semibold leading-snug">{video.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="tabular-nums">{formatCount(video.viewCount + (video.status === "published" ? 1 : 0))} 播放</span>
            <span className="tabular-nums">{formatCount(video.danmakuCount)} 弹幕</span>
            {video.publishedAt && <span>{timeAgo(video.publishedAt)}</span>}
            {video.category && (
              <Link href={`/c/${video.category.slug}`} className="text-accent hover:underline">
                {video.category.name}
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
            <Link href={`/u/${video.author.username}`} className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
                {video.author.displayName.slice(0, 1)}
              </span>
              <span>
                <span className="block text-sm font-medium group-hover:text-accent">{video.author.displayName}</span>
                <span className="block text-xs text-muted">@{video.author.username}</span>
              </span>
            </Link>
            <ActionBar
              videoId={video.id}
              likeCount={video.likeCount}
              coinCount={video.coinCount}
              favoriteCount={video.favoriteCount}
              isLoggedIn={Boolean(viewer)}
            />
          </div>

          <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{video.description || "（作者还没写简介）"}</p>
            {video.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {video.tags.map(({ tag }) => (
                  <Link
                    key={tag.id}
                    href={`/search?q=${encodeURIComponent(tag.name)}`}
                    className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted transition hover:bg-accent-soft hover:text-accent"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <CommentSection videoId={video.id} initial={commentNodes} canComment={Boolean(viewer)} />
        </div>

        <aside>
          <h2 className="text-sm font-semibold">同分区推荐</h2>
          <div className="mt-3 space-y-3">
            {relatedItems.length === 0 && <p className="text-xs text-muted">这个分区暂时没有更多视频。</p>}
            {relatedItems.map((item) => (
              <Link key={item.id} href={`/watch/${item.id}`} className="group flex gap-3">
                <div className="relative aspect-video w-[124px] shrink-0 overflow-hidden rounded-lg bg-[#e9e6e0]">
                  {item.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] text-white">
                    {formatDuration(item.durationSec)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] leading-snug transition group-hover:text-accent">{item.title}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {item.author.displayName} · {formatCount(item.viewCount)} 播放
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
