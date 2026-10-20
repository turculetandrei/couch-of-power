export function CouchGlyph({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <path d="M2.5 12.5a2 2 0 0 1 4 0V15h11v-2.5a2 2 0 0 1 4 0V17a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" />
      <path d="M5 19v1.5M19 19v1.5" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[17px] font-medium tracking-tight">
      <span className="flex size-9 items-center justify-center rounded-full bg-fg text-bg">
        <CouchGlyph size={20} />
      </span>
      Couch of Power
    </span>
  );
}
