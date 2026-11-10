import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCategories, getFeed } from "@/lib/queries";
import { BrowseShell } from "@/components/BrowseShell";
import { VideoFeed } from "@/components/VideoFeed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  return { title: category ? `${category.name}分区` : "分区" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, categories] = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    getCategories(),
  ]);
  if (!category) notFound();

  const feed = await getFeed({ category: slug, limit: 12 });

  return (
    <BrowseShell categories={categories} active={slug}>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">{category.name}</h1>
        <p className="mt-0.5 text-xs text-muted">该分区下已发布的全部稿件，按时间倒序</p>
      </div>
      <VideoFeed
        initial={feed}
        query={{ category: slug }}
        emptyTitle={`「${category.name}」分区还没有视频`}
        emptyHint="换个分区看看，或者在创作中心投稿到这里。"
      />
    </BrowseShell>
  );
}
