"use client";

import { ReservationCard, RiderReservationItem } from "@/components/reservations/ReservationCard";

type RiderReservationListProps = {
  title: string;
  description: string;
  items: RiderReservationItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function RiderReservationList({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: RiderReservationListProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/75 p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-text">{title}</p>
          <p className="mt-1 text-sm text-brand-secondary">{description}</p>
        </div>
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-brand-border bg-brand-background px-3 text-sm font-semibold text-brand-text">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-brand-border bg-brand-background/60 px-5 py-8 text-center">
          <p className="text-base font-semibold text-brand-text">{emptyTitle}</p>
          <p className="mt-2 text-sm text-brand-secondary">{emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {items.map((item) => (
            <ReservationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
