import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { UploadForm } from "@/components/UploadForm";
import { formatCount, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "创作中心" };

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  processing: { text: "转码中", className: "bg-warn/10 text-warn" },
  published: { text: "已发布", className: "bg-accent-soft text-accent" },
  rejected: { text: "未通过", className: "bg-danger/10 text-danger" },
  draft: { text: "草稿", className: "bg-paper text-muted" },
};

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const [categories, videos] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    prisma.video.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        coverUrl: true,
        viewCount: true,
        danmakuCount: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">创作中心</h1>
          <p className="mt-0.5 text-xs text-muted">
            当前账号 @{user.username} · 共 {videos.length} 个稿件
          </p>
        </div>
        <Link href="/" className="text-xs text-muted hover:text-accent">
          回到首页
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <UploadForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

        <section className="min-w-0">
          <h2 className="text-sm font-semibold">我的稿件</h2>

          {videos.length === 0 ? (
            <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
              <p className="text-sm text-ink-soft">还没有投过稿</p>
              <p className="mt-1.5 text-xs text-muted">左侧选择一个视频文件，填好标题就能发布。</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
              {videos.map((v) => {
                const status = STATUS_LABEL[v.status] ?? STATUS_LABEL.draft;
                return (
                  <li key={v.id} className="flex items-center gap-3 p-3">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-[#e9e6e0]">
                      {v.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/watch/${v.id}`} className="line-clamp-1 text-sm hover:text-accent">
                        {v.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {formatCount(v.viewCount)} 播放 · {formatCount(v.danmakuCount)} 弹幕 · {timeAgo(v.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${status.className}`}>
                      {status.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
