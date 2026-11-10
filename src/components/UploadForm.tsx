"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: string; name: string };

export function UploadForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "transcoding" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const inputClass =
    "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition focus:border-accent";

  function pickFile(f: File | null) {
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 120));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("请先选择视频文件");
      setPhase("error");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("description", description);
    form.append("categoryId", categoryId);
    form.append("tags", tags);

    setPhase("uploading");
    setProgress(0);
    setMessage("");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload");

    // 上传进度用 XHR 才能拿到；转码阶段没有百分比，只给文案
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setProgress(percent);
      if (percent >= 100) setPhase("transcoding");
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setPhase("done");
          setCreatedId(data.video.id);
          setMessage("投稿成功，视频已发布");
          setFile(null);
          setTitle("");
          setDescription("");
          setTags("");
          router.refresh();
        } else {
          setPhase("error");
          setMessage(data.error ?? "投稿失败");
        }
      } catch {
        setPhase("error");
        setMessage("服务端返回异常");
      }
    };
    xhr.onerror = () => {
      setPhase("error");
      setMessage("网络中断，请重试");
    };
    xhr.send(form);
  }

  const busy = phase === "uploading" || phase === "transcoding";

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold">上传新视频</h2>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong bg-paper/60 px-4 py-8 text-center transition hover:border-accent">
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm text-ink-soft">{file ? file.name : "点击选择视频文件"}</span>
        <span className="text-xs text-faint">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "支持 mp4 / webm / mov，单文件上限 2GB"}
        </span>
      </label>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">标题</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputClass} required />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">简介</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">分区</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">标签（逗号分隔，最多 8 个）</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="vlog, 教程" />
          </label>
        </div>
      </div>

      {busy && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${phase === "transcoding" ? 100 : progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {phase === "transcoding" ? "上传完成，正在转码（生成封面与 720p/480p）…" : `上传中 ${progress}%`}
          </p>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-xs ${phase === "error" ? "text-danger" : "text-accent"}`}>
          {message}
          {createdId && (
            <Link href={`/watch/${createdId}`} className="ml-2 underline underline-offset-2">
              去播放页看看
            </Link>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 h-10 w-full rounded-lg bg-ink text-sm font-medium text-white transition hover:bg-ink-soft disabled:opacity-50"
      >
        {busy ? "处理中…" : "发布"}
      </button>
    </form>
  );
}
