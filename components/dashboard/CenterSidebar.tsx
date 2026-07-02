"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type CenterSidebarProps = {
  isOpen: boolean;
  centerName?: string | null;
  activeCenterId?: string | null;
  onClose: () => void;
  onManageModules: () => void;
  onLogout: () => void;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

const iconClassName = "h-5 w-5";

const HomeIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const ProfileIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PlanIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 15h4" />
  </svg>
);

const ModulesIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const RequestsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6" />
    <path d="M22 11h-6" />
  </svg>
);

const ClientsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LogoutIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export function CenterSidebar({
  isOpen,
  centerName,
  activeCenterId,
  onClose,
  onManageModules,
  onLogout,
}: CenterSidebarProps) {
  const pathname = usePathname();
  const requestsHref = activeCenterId ? `/centros/${activeCenterId}` : "/dashboard/center";

  const items: MenuItem[] = [
    { label: "Inicio", href: "/dashboard/center", icon: <HomeIcon /> },
    { label: "Mi perfil", href: "/dashboard/center/profile", icon: <ProfileIcon /> },
    { label: "Mi plan", href: "/dashboard/center/plan", icon: <PlanIcon /> },
    { label: "Clientes", href: "/clientes", icon: <ClientsIcon /> },
    { label: "Gestionar módulos", icon: <ModulesIcon />, onClick: onManageModules },
    { label: "Solicitudes de acceso", href: requestsHref, icon: <RequestsIcon /> },
    { label: "Cerrar sesión", icon: <LogoutIcon />, onClick: onLogout, danger: true },
  ];

  const baseItemClassName =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  const runAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[min(21rem,calc(100vw-2rem))] flex-col border-r border-brand-border bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menú del panel del centro"
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-border bg-brand-background/70 px-4 py-4">
          <div className="min-w-0">
            <Image
              src="/logo-equidata.png"
              alt="Equidata"
              width={150}
              height={150}
              className="h-auto w-32"
              priority
            />
            <h2 className="mt-3 truncate text-lg font-semibold text-brand-text">
              {centerName ?? "Centro"}
            </h2>
            <p className="text-sm text-brand-secondary">Panel del centro</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-text transition hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = Boolean(item.href && pathname === item.href);
            const className = `${baseItemClassName} ${
              active
                ? "bg-brand-primary text-white"
                : item.danger
                  ? "text-red-700 hover:bg-red-50"
                  : "text-brand-text hover:bg-brand-background hover:text-brand-primary"
            }`;

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} onClick={onClose} className={className}>
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => item.onClick && runAction(item.onClick)}
                className={className}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
