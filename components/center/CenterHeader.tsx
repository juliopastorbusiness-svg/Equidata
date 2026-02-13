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
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text hover:bg-white"
              >
                Volver a Centro
              </Link>
            )}
            <h1 className="truncate text-2xl font-bold tracking-tight text-brand-text md:text-3xl">
              {title}
            </h1>
          </div>
          {subtitle && <p className="mt-1 text-sm text-brand-secondary">{subtitle}</p>}
        </div>

        {primaryActionLabel && primaryActionHref && (
          <Link
            href={primaryActionHref}
            className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primaryHover"
          >
            {primaryActionLabel}
          </Link>
        )}

        {primaryActionLabel && !primaryActionHref && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primaryHover"
          >
            {primaryActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}

