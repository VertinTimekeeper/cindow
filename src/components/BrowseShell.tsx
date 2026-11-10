import Link from "next/link";
import type { Category } from "@prisma/client";

export function BrowseShell({
  categories,
  active,
  children,
}: {
  categories: Category[];
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className="flex gap-8 py-6">
        <aside className="sticky top-20 hidden w-[176px] shrink-0 self-start lg:block">
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">分区</p>
          <nav className="space-y-0.5">
            <Link
              href="/"
              className={`block rounded-md px-2 py-1.5 text-sm transition ${
                !active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-surface"
              }`}
            >
              全部
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className={`block rounded-md px-2 py-1.5 text-sm transition ${
                  active === c.slug ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-surface"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:hidden">
            <Link
              href="/"
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                !active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-soft"
              }`}
            >
              全部
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                  active === c.slug
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-soft"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
