import Link from "next/link";
import type { FeedItem } from "@/lib/queries";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";

export function VideoCard({ video }: { video: FeedItem }) {
  return (
    <article className="group">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-[#e9e6e0]">
          {video.coverUrl ? (
            // 封面由本地 /media 路由提供，不使用 next/image 的远程优化
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.coverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-faint">暂无封面</div>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] tabular-nums text-white">
            {formatDuration(video.durationSec)}
          </span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[15px] font-medium leading-snug text-ink transition group-hover:text-accent">
          {video.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{video.author.displayName}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 tabular-nums">{formatCount(video.viewCount)} 播放</span>
          {video.publishedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{timeAgo(video.publishedAt)}</span>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
