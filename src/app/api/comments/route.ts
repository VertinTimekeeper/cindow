import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";

export async function GET(req: Request) {
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) return fail(400, "缺少 videoId");

  const roots = await prisma.comment.findMany({
    where: { videoId, parentId: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { username: true, displayName: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { username: true, displayName: true } } },
      },
    },
  });

  return ok({ items: roots });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "登录后才能评论");

  const body = await readJson(req);
  if (!body) return fail(400, "请求体需要是 JSON");

  const videoId = str(body.videoId, 40);
  const content = str(body.content, 500);
  const parentId = body.parentId ? str(body.parentId, 40) : null;

  if (!videoId) return fail(400, "缺少 videoId");
  if (!content) return fail(400, "评论内容不能为空");

  const video = await prisma.video.findFirst({ where: { id: videoId, status: "published" }, select: { id: true } });
  if (!video) return fail(404, "视频不存在");

  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, videoId }, select: { id: true } });
    if (!parent) return fail(400, "被回复的评论不存在");
    // 只做两级：对回复再回复时，挂到同一条根评论下
    const root = await prisma.comment.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (root?.parentId) return fail(400, "暂不支持三级回复");
  }

  const created = await prisma.comment.create({
    data: { videoId, userId: user.id, content, parentId },
    include: { user: { select: { username: true, displayName: true } } },
  });
  await prisma.video.update({ where: { id: videoId }, data: { commentCount: { increment: 1 } } });

  return ok({ item: { ...created, replies: [] } }, { status: 201 });
}
