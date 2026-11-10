import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo, Wordmark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || "/");

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-accent">
        <Logo size={34} />
        <Wordmark />
        <p className="mt-1 text-xs text-muted">个人练习用的视频社区 · 工程骨架</p>
      </div>
      <AuthForm next={next ?? "/"} />
    </div>
  );
}
