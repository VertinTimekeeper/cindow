import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFeed } from "@/lib/queries";
import { VideoFeed } from "@/components/VideoFeed";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: { select: { videos: true, followers: true, following: true } },
    },
  });
  if (!user) notFound();

  const feed = await getFeed({ author: username, limit: 12 });

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6">
      <div className="h-28 rounded-[var(--radius-card)] bg-[linear-gradient(100deg,#e6ece9,#f0e9df_55%,#e8e4f0)]" />

      <div className="-mt-8 flex flex-wrap items-end gap-4 px-1">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-paper bg-accent-soft text-2xl font-medium text-accent">
          {user.displayName.slice(0, 1)}
        </span>
        <div className="pb-1">
          <h1 className="text-xl font-semibold">{user.displayName}</h1>
          <p className="text-xs text-muted">@{user.username}</p>
        </div>
      </div>

      <p className="mt-3 max-w-[560px] text-sm text-ink-soft">{user.bio || "这个人还没有写简介。"}</p>

      <div className="mt-3 flex gap-5 text-xs text-muted">
        <span>
          <span className="font-medium text-ink">{formatCount(user._count.videos)}</span> 作品
        </span>
        <span>
          <span className="font-medium text-ink">{formatCount(user._count.followers)}</span> 粉丝
        </span>
        <span>
          <span className="font-medium text-ink">{formatCount(user._count.following)}</span> 关注
        </span>
      </div>

      <div className="mt-6 border-b border-line pb-2">
        <span className="border-b-2 border-ink pb-2 text-sm font-medium">作品</span>
      </div>

      <div className="py-6">
        <VideoFeed
          initial={feed}
          query={{ author: username }}
          emptyTitle={`@${user.username} 还没有发布视频`}
          emptyHint="等 TA 的第一条投稿吧。"
        />
      </div>
    </div>
  );
}
