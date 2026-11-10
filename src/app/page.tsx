import type { Metadata } from "next";
import { getCategories, getFeed } from "@/lib/queries";
import { BrowseShell } from "@/components/BrowseShell";
import { VideoFeed } from "@/components/VideoFeed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "首页" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const activeSort = sort === "hot" ? "hot" : "latest";

  const [categories, feed] = await Promise.all([
    getCategories(),
    getFeed({ sort: activeSort, limit: 12 }),
  ]);

  return (
    <BrowseShell categories={categories}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{activeSort === "hot" ? "热门" : "最新发布"}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {activeSort === "hot" ? "按播放量排序，全站可见稿件" : "按发布时间倒序，滚动到底自动加载"}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-xs">
          <a
            href="/"
            className={`rounded-full px-3 py-1 transition ${
              activeSort === "latest" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            最新
          </a>
          <a
            href="/?sort=hot"
            className={`rounded-full px-3 py-1 transition ${
              activeSort === "hot" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            热门
          </a>
        </div>
      </div>

      <VideoFeed initial={feed} query={{ sort: activeSort }} emptyTitle="全站还没有已发布的视频" />
    </BrowseShell>
  );
}
