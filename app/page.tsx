"use client";

import Link from "next/link";
import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Feature = {
  icon: string;
  title: string;
  description: string;
};

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const features: Feature[] = [
  {
    icon: "📅",
    title: "Reservas",
    description: "Agenda pistas, clases y cupos sin solapamientos.",
  },
  {
    icon: "🐴",
    title: "Cuadras",
    description: "Ocupacion, caballos activos y capacidad bajo control.",
  },
  {
    icon: "💳",
    title: "Facturacion",
    description: "Pagos, clientes y movimientos con lectura clara.",
  },
  {
    icon: "🌾",
    title: "Piensos",
    description: "Stock, consumos y reposicion desde una vista unica.",
  },
  {
    icon: "✅",
    title: "Tareas",
    description: "Responsables, pendientes y seguimiento operativo.",
  },
  {
    icon: "👨‍🏫",
    title: "Alumnos",
    description: "Clientes, clases y actividad reciente centralizadas.",
  },
];

const plans: Plan[] = [
  {
    name: "Basico",
    price: "24,99",
    description: "Para centros que quieren ordenar lo esencial.",
    features: ["Hasta 20 caballos", "3 modulos activos", "Gestion basica", "Reservas esenciales"],
  },
  {
    name: "Profesional",
    price: "49,99",
    description: "La experiencia completa para gestionar el centro.",
    highlighted: true,
    features: ["Hasta 50 caballos", "Todos los modulos", "Facturacion avanzada", "Reservas y cuadras", "Gestion completa"],
  },
  {
    name: "Premium",
    price: "79,99",
    description: "Para centros grandes con operativa avanzada.",
    features: ["Caballos ilimitados", "Todo incluido", "Soporte prioritario", "Pensado para centros grandes"],
  },
];

const activityItems = [
  { label: "Clase de doma", time: "10:30", status: "Confirmada" },
  { label: "Pago mensualidad", time: "12:00", status: "Pendiente" },
  { label: "Revision cuadra 4", time: "16:15", status: "Equipo" },
];

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-brand-primary shadow-[0_18px_45px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#F8F4EB] focus:outline-none focus:ring-2 focus:ring-white/80"
    >
      {children}
    </Link>
  );
}

function DarkLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-bold text-white shadow-[0_18px_45px_rgba(47,79,62,0.24)] transition hover:-translate-y-0.5 hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
    >
      {children}
    </Link>
  );
}

function OutlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/16 focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      {children}
    </Link>
  );
}

function MiniStat({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[0_16px_36px_rgba(0,0,0,0.12)] backdrop-blur-xl ${
        tone === "dark" ? "border-white/16 bg-[#16241D]/72 text-white" : "border-white/45 bg-white/78 text-brand-text"
      }`}
    >
      <p className={tone === "dark" ? "text-xs text-white/62" : "text-xs text-brand-text/55"}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function HeroDashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[38rem] lg:ml-auto">
      <div className="absolute -left-5 top-10 hidden w-44 rotate-[-4deg] sm:block lg:-left-12">
        <MiniStat label="Reservas de hoy" value="18" />
      </div>
      <div className="absolute -right-2 top-32 z-20 hidden w-48 rotate-[3deg] sm:block lg:-right-8">
        <MiniStat label="Pagos pendientes" value="7.840 EUR" tone="dark" />
      </div>
      <div className="absolute bottom-8 left-8 z-20 hidden w-48 rotate-[2deg] md:block">
        <MiniStat label="Ocupacion cuadras" value="84%" />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/18 bg-[#132019]/74 p-3 shadow-[0_36px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        <div className="rounded-[1.55rem] border border-white/10 bg-[#F6F2E9] p-4 shadow-inner sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">Panel central</p>
              <h3 className="mt-1 text-lg font-semibold text-brand-text">Operacion del dia</h3>
            </div>
            <div className="rounded-full bg-brand-primary px-3 py-1 text-xs font-bold text-white">En vivo</div>
          </div>

          <div className="grid gap-3 py-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(31,31,31,0.08)]">
              <p className="text-xs text-brand-text/55">Eventos</p>
              <p className="mt-2 text-2xl font-semibold">12</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(31,31,31,0.08)]">
              <p className="text-xs text-brand-text/55">Reservas</p>
              <p className="mt-2 text-2xl font-semibold">34</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(31,31,31,0.08)]">
              <p className="text-xs text-brand-text/55">Cobrado</p>
              <p className="mt-2 text-2xl font-semibold">62%</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-brand-border bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Proximas reservas</p>
                <span className="rounded-full bg-[#E8EFE8] px-3 py-1 text-xs font-bold text-brand-primary">Hoy</span>
              </div>
              <div className="space-y-3">
                {activityItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl bg-brand-background px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-brand-text/55">{item.status}</p>
                    </div>
                    <p className="text-sm font-bold text-brand-primary">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-4">
              <p className="text-sm font-semibold">Calendario</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }).map((_, index) => (
                  <span
                    key={index}
                    className={`aspect-square rounded-lg ${
                      [4, 7, 12, 13, 18, 24].includes(index)
                        ? "bg-brand-primary"
                        : [2, 10, 21].includes(index)
                          ? "bg-brand-secondary/45"
                          : "bg-brand-background"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-[#F0E5D4] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary">Proximo evento</p>
                <p className="mt-1 text-sm font-semibold">Concurso social - Sabado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <Reveal delay={index * 45}>
      <article className="group rounded-2xl border border-brand-border bg-white/82 p-5 shadow-[0_14px_34px_rgba(31,31,31,0.07)] transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-[0_24px_50px_rgba(31,31,31,0.12)]">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#E8EFE8] text-lg transition group-hover:bg-brand-primary">
            {feature.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-brand-text">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-brand-text/66">{feature.description}</p>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function ShowcaseMockup() {
  const sidebarItems = ["Inicio", "Mi perfil", "Mi plan", "Gestionar modulos", "Solicitudes de acceso"];
  const moduleCards = [
    ["📅", "Reservas", "Agenda visual del centro."],
    ["💳", "Facturacion", "Cobros, pagos y seguimiento."],
    ["✅", "Tareas", "Operacion diaria del centro."],
    ["🐴", "Cuadras", "Ocupacion, estancias y boxes."],
    ["🌿", "Paddocks", "Rotacion, ocupacion y prados."],
    ["🎓", "Clases", "Alumnos, caballos y capacidad."],
    ["🎠", "Pistas", "Reservas, estado y disponibilidad."],
    ["💊", "Medicamentos", "Stock y tratamientos por caballo."],
    ["👨‍🏫", "Alumnos", "Reservas, fichas y pagos."],
    ["🏋️", "Entrenamientos", "Planificacion deportiva."],
    ["🏆", "Competiciones", "Calendario competitivo."],
  ];

  return (
    <div className="relative mx-auto mt-10 max-w-7xl">
      <div className="absolute inset-x-12 top-10 h-48 rounded-full bg-brand-secondary/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#EEEAE2] p-2 shadow-[0_38px_110px_rgba(47,79,62,0.22)] backdrop-blur-xl">
        <div className="relative min-h-[34rem] overflow-hidden rounded-[1.6rem] border border-brand-border bg-[#F4F1EB]">
          <aside className="absolute left-0 top-0 z-20 hidden h-full w-[16.5rem] border-r border-brand-border bg-white/94 shadow-[22px_0_55px_rgba(31,31,31,0.13)] backdrop-blur-xl lg:block">
            <div className="flex h-full flex-col px-4 py-7">
              <div className="flex justify-center">
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#E9EFE8] shadow-[0_12px_30px_rgba(47,79,62,0.12)]">
                  <Image
                    src="/logo-equidata.png"
                    alt="Equidata"
                    width={180}
                    height={180}
                    className="h-[150%] w-[150%] max-w-none object-cover"
                  />
                </div>
              </div>
              <div className="mt-12">
                <p className="text-lg font-black uppercase tracking-tight text-brand-text">Centrohipico</p>
                <p className="mt-1 text-sm font-medium text-brand-secondary">Panel del centro</p>
              </div>

              <nav className="mt-8 space-y-2">
                {sidebarItems.map((item, index) => (
                  <div
                    key={item}
                    className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold ${
                      index === 0 ? "bg-brand-primary text-white" : "text-brand-text"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-white" : "bg-brand-border"}`} />
                    {item}
                  </div>
                ))}
                <div className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#C01818]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#C01818]" />
                  Cerrar sesion
                </div>
              </nav>

            </div>
          </aside>

          <div className="border-b border-brand-border bg-[#F8F6F1]/88 px-5 py-5 text-center">
            <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-brand-border bg-white text-xl font-light text-brand-text shadow-sm lg:left-[18rem]">
              x
            </div>
            <div className="mx-auto flex max-w-xl items-center justify-center">
              <div>
                <h3 className="font-serif text-xl uppercase tracking-[0.18em] text-brand-text sm:text-2xl">Centrohipico</h3>
                <p className="text-xs font-bold text-brand-secondary">Panel del centro - 13 modulos activos</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F0EDE6] px-4 py-3 lg:pl-[17.75rem]">
            <div className="h-5 rounded-full border border-brand-border bg-[#E9E5DC]" />
          </div>

          <div className="p-4 lg:pl-[17.75rem]">
            <div className="rounded-2xl border border-brand-border bg-white/78 p-4 shadow-[0_14px_40px_rgba(31,31,31,0.08)]">
              <p className="mb-4 text-sm font-semibold text-brand-secondary">Gestiona todos los modulos activos del centro.</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {moduleCards.map(([icon, title, description]) => (
                  <div
                    key={title}
                    className="group flex min-h-[5.75rem] items-center gap-4 rounded-2xl border border-brand-border bg-white px-4 py-3 shadow-[0_8px_20px_rgba(31,31,31,0.08)] transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-[0_18px_36px_rgba(31,31,31,0.12)]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-brand-border bg-[#F4F1EA] text-xl">
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black text-brand-text">{title}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-brand-secondary">{description}</p>
                    </div>
                    <span className="text-lg text-brand-secondary transition group-hover:translate-x-1">›</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex min-h-16 items-center justify-end rounded-2xl border border-brand-border bg-white/78 px-4 shadow-[0_14px_35px_rgba(31,31,31,0.07)]">
              <button className="rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-secondary">
                Desplegar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={`group relative flex h-full flex-col rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_45px_rgba(31,31,31,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_65px_rgba(31,31,31,0.14)] ${
        plan.highlighted ? "border-brand-primary ring-4 ring-brand-primary/10" : "border-brand-border"
      }`}
    >
      {plan.highlighted ? (
        <span className="absolute right-5 top-5 rounded-full bg-brand-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
          Mas popular
        </span>
      ) : null}
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-secondary">{plan.name}</p>
      <div className="mt-5 flex items-end gap-1">
        <p className="text-4xl font-semibold tracking-tight">{plan.price}</p>
        <p className="pb-1 text-sm font-semibold text-brand-text/58">EUR/mes</p>
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-brand-text/66">{plan.description}</p>
      <div className="mt-6 h-px bg-brand-border" />
      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm font-medium text-brand-text/78">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#E8EFE8] text-xs font-black text-brand-primary">
              &#10003;
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <DarkLink href="/register">Empezar ahora</DarkLink>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-brand-background text-brand-text">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#122018]/88 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:h-18 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Equidata">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
              <Image
                src="/logo-equidata.png"
                alt="Equidata"
                width={72}
                height={72}
                className="h-[150%] w-[150%] max-w-none object-cover"
              />
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.22em]">Equidata</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Acceso">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/18 bg-white/8 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/14 sm:px-5"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-brand-primary transition hover:bg-[#F8F4EB] sm:px-5"
            >
              Registro
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative -mt-16 overflow-hidden bg-[#122018] pt-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-72"
          style={{ backgroundImage: "url('/centroecu.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(108,138,115,0.28),transparent_36%),linear-gradient(115deg,rgba(18,32,24,0.88)_0%,rgba(18,32,24,0.74)_44%,rgba(18,32,24,0.46)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(to_bottom,transparent_0%,transparent_62%,rgba(245,242,236,0.68)_88%,#f5f2ec_100%)]" />

        <div className="relative mx-auto grid min-h-[46rem] w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/78 backdrop-blur-md">
                Plataforma SaaS para centros hipicos
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
                Toda la gesti&oacute;n de tu centro h&iacute;pico, en un solo lugar.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">
                Reservas, cuadras, facturaci&oacute;n, clientes y operaci&oacute;n diaria organizados desde una plataforma moderna y clara.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/register">Empezar ahora</PrimaryLink>
                <OutlineLink href="#funcionalidades">Ver funcionalidades</OutlineLink>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/68">
                {["Reservas en tiempo real", "Facturacion clara", "Control de cuadras"].map((item) => (
                  <span key={item} className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 backdrop-blur-md">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <HeroDashboardMockup />
          </Reveal>
        </div>
      </section>

      <section id="funcionalidades" className="relative mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Modulos de software</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                Funcionalidades compactas para dirigir mejor cada dia.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-brand-text/66">
              Cada modulo esta pensado para reducir ruido operativo y convertir datos dispersos en decisiones claras.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#EDE7DC] py-16 sm:py-20">
        <div className="absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Showcase</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                La manera inteligente de gestionar tu centro h&iacute;pico.
              </h2>
              <p className="mt-5 text-base leading-8 text-brand-text/70 sm:text-lg">
                Equidata centraliza reservas, caballos, clientes, facturaci&oacute;n y operaciones diarias en una &uacute;nica plataforma.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ShowcaseMockup />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">Suscripcion</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              Planes pensados para cada centro h&iacute;pico.
            </h2>
            <p className="mt-5 text-base leading-8 text-brand-text/70 sm:text-lg">
              Empieza con lo esencial y escala seg&uacute;n crezca tu centro.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <Reveal key={plan.name} delay={plan.highlighted ? 90 : 0}>
              <PricingCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
