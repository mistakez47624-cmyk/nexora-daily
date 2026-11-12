
export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      {/* NEXORA Symbol */}
      <span
        aria-hidden="true"
        className="group/logo relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#9B7BFF] via-[#7045E8] to-[#382078] shadow-[0_2px_18px_rgba(124,87,255,0.28)] transition-all duration-500 hover:shadow-[0_2px_26px_rgba(145,105,255,0.5)]"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="size-8 transition-transform duration-500 group-hover/logo:scale-110"
        >
          <defs>
            <linearGradient id="nexora-mark" x1="5" y1="5" x2="35" y2="35">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#D7C5FF" />
            </linearGradient>
          </defs>

          <path
            d="M9 29V11L29 29V11"
            stroke="url(#nexora-mark)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M29 11C29 7 33 7 33 10"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".85"
          />
        </svg>

        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </span>

      {/* Wordmark */}
      <span className="wordmark truncate text-sm font-semibold tracking-[0.16em] text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        NEXORA
      </span>
    </span>
  );
}
