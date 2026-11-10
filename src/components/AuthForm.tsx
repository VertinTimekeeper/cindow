"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState("demo@vidora.local");
  const [password, setPassword] = useState("vidora1234");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login" ? { account, password } : { email, username, password, displayName: username };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "操作失败");
        return;
      }
      router.refresh();
      router.push(next || "/");
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none transition focus:border-accent";

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="mb-6 flex gap-1 rounded-full border border-line bg-surface p-1">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`h-9 flex-1 rounded-full text-sm transition ${
              mode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {m === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "login" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">邮箱或用户名</span>
            <input
              className={inputClass}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">邮箱</span>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">用户名（3-20 位字母数字）</span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-zA-Z0-9_-]{3,20}"
                required
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">密码</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-lg bg-ink text-sm font-medium text-white transition hover:bg-ink-soft disabled:opacity-50"
        >
          {busy ? "处理中…" : mode === "login" ? "登录" : "创建账号"}
        </button>
      </form>

      {mode === "login" && (
        <p className="mt-4 text-center text-xs text-faint">
          演示账号已预填：demo@vidora.local / vidora1234
        </p>
      )}

      <p className="mt-6 text-center text-xs text-faint">
        <Link href="/" className="hover:text-accent">
          先随便逛逛
        </Link>
      </p>
    </div>
  );
}
