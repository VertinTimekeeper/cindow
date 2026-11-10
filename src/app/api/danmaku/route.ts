import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";

export async function GET(req: Request) {
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) return fail(400, "缺少 videoId");

  const items = await prisma.danmaku.findMany({
    where: { videoId },
    orderBy: { timeSec: "asc" },
    take: 2000,
    select: { id: true, content: true, timeSec: true, color: true, mode: true, fontSize: true },
  });

  return ok({ items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "登录后才能发送弹幕");

  const body = await readJson(req);
  if (!body) return fail(400, "请求体需要是 JSON");

  const videoId = str(body.videoId, 40);
  const content = str(body.content, 50);
  const timeSec = Number(body.timeSec);
  const color = /^#[0-9a-fA-F]{6}$/.test(str(body.color, 7)) ? str(body.color, 7) : "#ffffff";

  if (!videoId) return fail(400, "缺少 videoId");
  if (!content) return fail(400, "弹幕内容不能为空");
  if (!Number.isFinite(timeSec) || timeSec < 0) return fail(400, "弹幕时间点不合法");

  const video = await prisma.video.findFirst({ where: { id: videoId, status: "published" }, select: { id: true } });
  if (!video) return fail(404, "视频不存在");

  const created = await prisma.danmaku.create({
    data: { videoId, userId: user.id, content, timeSec, color },
    select: { id: true, content: true, timeSec: true, color: true, mode: true, fontSize: true },
  });
  await prisma.video.update({ where: { id: videoId }, data: { danmakuCount: { increment: 1 } } });

  return ok({ item: created }, { status: 201 });
}
