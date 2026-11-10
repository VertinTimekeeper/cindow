import { getFeed, type FeedSort } from "@/lib/queries";
import { fail, ok } from "@/lib/http";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") === "hot" ? "hot" : "latest") as FeedSort;

  try {
    const result = await getFeed({
      q: searchParams.get("q")?.trim() || undefined,
      category: searchParams.get("category")?.trim() || undefined,
      author: searchParams.get("author")?.trim() || undefined,
      sort,
      cursor: searchParams.get("cursor"),
      limit: Number(searchParams.get("limit") ?? 12),
    });
    return ok(result);
  } catch (error) {
    console.error("[api/videos]", error);
    return fail(500, "信息流加载失败");
  }
}
