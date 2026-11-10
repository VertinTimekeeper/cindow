export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.1" y="1.1" width="21.8" height="21.8" rx="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.8 8.1 16 12l-6.2 3.9V8.1Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="text-[17px] font-semibold tracking-[0.14em] text-ink">
      VIDORA
    </span>
  );
}
