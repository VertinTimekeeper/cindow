import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

/** 本地媒体根目录。上线换对象存储时，这里替换成 OSS/S3 客户端即可，其余代码不用动 */
export const MEDIA_ROOT = path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_ROOT ?? "./storage/media");

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export function run(cmd: string, args: string[], timeoutMs = 1000 * 60 * 10) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

let ffmpegAvailable: boolean | null = null;

/** 转码是可降级能力：没有 ffmpeg 也能上传，只是只有原片、没有封面和多清晰度 */
export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  const probe = await run("ffmpeg", ["-version"], 5000);
  ffmpegAvailable = probe.code === 0;
  return ffmpegAvailable;
}

export async function probeDurationMs(file: string): Promise<number> {
  const res = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number.parseFloat(res.stdout.trim());
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0;
}

export async function makePoster(input: string, output: string, atSec = 1) {
  return run("ffmpeg", [
    "-y",
    "-ss",
    String(atSec),
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    "scale=640:-2",
    "-q:v",
    "3",
    output,
  ]);
}

/** 转一档清晰度。height 为目标高度，宽度按比例自动对齐 */
export async function transcode(input: string, output: string, height: number) {
  return run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    `scale=-2:${height}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "26",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    output,
  ]);
}

export async function fileSize(file: string): Promise<number> {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}
