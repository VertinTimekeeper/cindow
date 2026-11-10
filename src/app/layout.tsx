import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Cindow · 视频社区",
    template: "%s · Cindow",
  },
  description: "个人视频社区站点，工程骨架阶段。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="mt-16 border-t border-line py-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-4 text-xs text-faint sm:px-6">
            <span>Cindow</span>
            <span>个人练习项目 · 不对外传播</span>
            <span className="ml-auto">所有视频素材为本地合成示例</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
