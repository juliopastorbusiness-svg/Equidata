"use client";

import Link from "next/link";

type CenterHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionHref?: string;
};

export function CenterHeader({
  title,
  subtitle,
  backHref,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionHref,
}: CenterHeaderProps) {
  const primaryActionClassName =
    "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl bg-brand-primary px-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background md:h-11 md:px-4";

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-background/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-2 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Volver al dashboard del centro"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white/70 text-brand-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            )}
            <h1 className="min-w-0 text-xl font-bold tracking-tight text-brand-text sm:text-2xl md:text-3xl">
              {title}
            </h1>
          </div>

          {primaryActionLabel && primaryActionHref && (
            <Link href={primaryActionHref} className={primaryActionClassName}>
              {primaryActionLabel}
            </Link>
          )}

          {primaryActionLabel && !primaryActionHref && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className={primaryActionClassName}
            >
              {primaryActionLabel}
            </button>
          )}
        </div>

        <div className="min-w-0">
          {subtitle && (
            <p className="mt-0.5 text-sm leading-5 text-brand-secondary">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

