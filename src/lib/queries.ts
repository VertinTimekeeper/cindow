import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type FeedSort = "latest" | "hot";

export type FeedItem = {
  id: string;
  title: string;
  coverUrl: string | null;
  durationSec: number;
  viewCount: number;
  danmakuCount: number;
  publishedAt: Date | null;
  author: { username: string; displayName: string; avatarUrl: string | null };
  category: { name: string; slug: string } | null;
};

export type FeedResult = {
  items: FeedItem[];
  nextCursor: string | null;
};

const FEED_SELECT = {
  id: true,
  title: true,
  coverUrl: true,
  durationSec: true,
  viewCount: true,
  danmakuCount: true,
  publishedAt: true,
  author: { select: { username: true, displayName: true, avatarUrl: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.VideoSelect;

export async function getFeed(opts: {
  q?: string;
  category?: string;
  author?: string;
  sort?: FeedSort;
  cursor?: string | null;
  limit?: number;
}): Promise<FeedResult> {
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 48);
  const where: Prisma.VideoWhereInput = { status: "published", visibility: "public" };

  if (opts.q) {
    where.OR = [
      { title: { contains: opts.q } },
      { description: { contains: opts.q } },
      { tags: { some: { tag: { name: { contains: opts.q } } } } },
    ];
  }
  if (opts.category) where.category = { slug: opts.category };
  if (opts.author) where.author = { username: opts.author };

  const orderBy: Prisma.VideoOrderByWithRelationInput[] =
    opts.sort === "hot" ? [{ viewCount: "desc" }, { id: "desc" }] : [{ publishedAt: "desc" }, { id: "desc" }];

  const rows = await prisma.video.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: FEED_SELECT,
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows) as FeedItem[];

  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { sort: "asc" } });
}

export async function getVideoDetail(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: {
      author: true,
      category: true,
      sources: { orderBy: { height: "desc" } },
      tags: { include: { tag: true } },
    },
  });
}
