import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, str } from "@/lib/http";
import { MEDIA_ROOT, ensureDir, hasFfmpeg, makePoster, probeDurationMs, transcode, fileSize } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 600;

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
};

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail(401, "请先登录再投稿");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "请选择视频文件");
  if (file.size === 0) return fail(400, "文件为空");
  if (file.size > MAX_BYTES) return fail(413, "单个文件不能超过 2GB");

  const title = str(form.get("title"), 120) || file.name.replace(/\.[^.]+$/, "");
  const description = str(form.get("description"), 5000);
  const categoryId = str(form.get("categoryId"), 40) || null;
  const tagNames = str(form.get("tags"), 200)
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  const ext = EXT_BY_TYPE[file.type] ?? path.extname(file.name).replace(".", "") ?? "mp4";
  const dirName = randomUUID();
  const dir = path.join(MEDIA_ROOT, dirName);
  await ensureDir(dir);

  const originalPath = path.join(dir, `original.${ext}`);
  await writeFile(originalPath, Buffer.from(await file.arrayBuffer()));

  const video = await prisma.video.create({
    data: {
      authorId: user.id,
      title,
      description,
      categoryId,
      status: "processing",
      visibility: "public",
      tags: {
        create: tagNames.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name, slug: name.toLowerCase().replace(/\s+/g, "-").slice(0, 32) },
            },
          },
        })),
      },
    },
  });

  const durationSec = Math.max(1, Math.round((await probeDurationMs(originalPath)) / 1000));
  const sources: Array<{ label: string; width: number; height: number; bitrate: number; url: string }> = [
    {
      label: "original",
      width: 0,
      height: 0,
      bitrate: 0,
      url: `/media/${dirName}/original.${ext}`,
    },
  ];
  let coverUrl: string | null = null;

  // 有 ffmpeg 就生成封面 + 两档清晰度；没有也不阻塞投稿（只保留原片）
  if (await hasFfmpeg()) {
    const posterPath = path.join(dir, "cover.jpg");
    const poster = await makePoster(originalPath, posterPath, Math.min(1, durationSec / 2));
    if (poster.code === 0) coverUrl = `/media/${dirName}/cover.jpg`;

    for (const height of [720, 480]) {
      const outPath = path.join(dir, `clip-${height}p.mp4`);
      const res = await transcode(originalPath, outPath, height);
      if (res.code === 0) {
        const size = await fileSize(outPath);
        if (size > 0) {
          sources.unshift({
            label: `${height}p`,
            width: Math.round((height * 16) / 9),
            height,
            bitrate: Math.round((size * 8) / durationSec / 1000),
            url: `/media/${dirName}/clip-${height}p.mp4`,
          });
        }
      }
    }
  }

  const updated = await prisma.video.update({
    where: { id: video.id },
    data: {
      status: "published",
      publishedAt: new Date(),
      durationSec,
      coverUrl,
      sources: { create: sources },
    },
    select: { id: true, title: true, status: true },
  });

  return ok({ video: updated }, { status: 201 });
}
