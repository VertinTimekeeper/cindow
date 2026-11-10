import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo, Wordmark } from "./Logo";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-accent">
          <Logo />
          <Wordmark />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm text-ink-soft md:flex">
          <Link href="/" className="rounded-md px-2.5 py-1.5 hover:bg-surface">
            首页
          </Link>
          <Link href="/search?sort=hot" className="rounded-md px-2.5 py-1.5 hover:bg-surface">
            热门
          </Link>
        </nav>

        <form action="/search" className="ml-auto w-full max-w-[380px]">
          <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 transition focus-within:border-accent">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-faint" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="搜索视频、标签、创作者"
              className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
              aria-label="搜索"
            />
          </label>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <Link
            href="/studio"
            className="hidden h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-soft sm:flex"
          >
            投稿
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-soft transition hover:border-line-strong"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
