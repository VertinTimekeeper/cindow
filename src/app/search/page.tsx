import type { Metadata } from "next";
import { getCategories, getFeed } from "@/lib/queries";
import { BrowseShell } from "@/components/BrowseShell";
import { VideoFeed } from "@/components/VideoFeed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "搜索" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const keyword = q?.trim() ?? "";
  const activeSort = sort === "hot" ? "hot" : "latest";

  const [categories, feed] = await Promise.all([
    getCategories(),
    keyword ? getFeed({ q: keyword, sort: activeSort, limit: 12 }) : Promise.resolve(null),
  ]);

  return (
    <BrowseShell categories={categories}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {keyword ? `「${keyword}」的搜索结果` : "搜索"}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {keyword
              ? `匹配标题、简介与标签${feed?.items.length ? "" : "，没有命中"}`
              : "在顶部搜索框输入关键词，支持标题、简介、标签"}
          </p>
        </div>
        {keyword && (
          <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-xs">
            <a
              href={`/search?q=${encodeURIComponent(keyword)}`}
              className={`rounded-full px-3 py-1 ${
                activeSort === "latest" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              最新
            </a>
            <a
              href={`/search?q=${encodeURIComponent(keyword)}&sort=hot`}
              className={`rounded-full px-3 py-1 ${
                activeSort === "hot" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              热门
            </a>
          </div>
        )}
      </div>

      {feed ? (
        <VideoFeed
          initial={feed}
          query={{ q: keyword, sort: activeSort }}
          emptyTitle={`没有找到与「${keyword}」相关的视频`}
          emptyHint="试试更短的关键词，或者只搜标签名。"
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
          <p className="text-sm text-ink-soft">还没有输入关键词</p>
          <p className="mt-1.5 text-xs text-muted">当前是关键词全量匹配，二期会换成独立搜索服务。</p>
        </div>
      )}
    </BrowseShell>
  );
}
