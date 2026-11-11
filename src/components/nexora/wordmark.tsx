export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        N
      </span>
      <span className="wordmark truncate text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        NEXORA
      </span>
    </span>
  );
}
