"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Feature = {
  title: string;
  description: string;
  accent: string;
  detailA: string;
  detailB: string;
  image: string;
};

const features: Feature[] = [
  {
    title: "Facturacion",
    description:
      "Controla cobros, clientes y pagos mensuales de forma sencilla para tener una vision clara de tu centro.",
    accent: "Flujo financiero claro",
    detailA: "Recibos y mensualidades",
    detailB: "Seguimiento de pagos",
    image: "/jerez.jpg",
  },
  {
    title: "Piensos",
    description:
      "Revisa el stock del almacen y evita quedarte sin producto con una gestion visual y ordenada.",
    accent: "Stock bajo control",
    detailA: "Inventario actualizado",
    detailB: "Alertas de reposicion",
    image: "/piensos.jpg",
  },
  {
    title: "Pistas",
    description:
      "Organiza horarios, reservas y cupos sin complicaciones para aprovechar mejor cada franja del dia.",
    accent: "Agenda sin conflictos",
    detailA: "Reservas centralizadas",
    detailB: "Control de ocupacion",
    image: "/PISTAS.jpg",
  },
  {
    title: "Tareas",
    description:
      "Manten al dia el trabajo del centro con una vista clara de pendientes, responsables y progreso.",
    accent: "Operacion diaria ordenada",
    detailA: "Panel de pendientes",
    detailB: "Seguimiento por equipo",
    image: "/tareas%201.jpg",
  },
  {
    title: "Cuadras",
    description:
      "Controla ocupacion, capacidad y caballos activos con una estructura facil de entender.",
    accent: "Capacidad siempre visible",
    detailA: "Estado por cuadra",
    detailB: "Caballos activos",
    image: "/Cuadras.jpg",
  },
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
      {
        threshold: 0.2,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const reverse = index % 2 !== 0;

  return (
    <Reveal delay={index * 80}>
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div
          className={`grid items-center gap-8 rounded-3xl border border-brand-border bg-white/65 p-6 shadow-[0_20px_60px_rgba(31,31,31,0.14)] backdrop-blur-sm sm:p-10 lg:grid-cols-2 lg:gap-12 ${
            reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-secondary">{feature.accent}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-brand-text sm:text-4xl">{feature.title}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-text/80 sm:text-lg">{feature.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-brand-text/85">
              <span className="rounded-full border border-brand-border bg-brand-background/70 px-4 py-2">{feature.detailA}</span>
              <span className="rounded-full border border-brand-border bg-brand-background/70 px-4 py-2">{feature.detailB}</span>
            </div>
          </div>

          <div
            className="relative min-h-[220px] overflow-hidden rounded-2xl border border-brand-border bg-cover bg-center p-6 sm:min-h-[260px]"
            style={{
              backgroundImage: `url('${feature.image}')`,
            }}
          />
        </div>
      </section>
    </Reveal>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-brand-background text-brand-text">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: "url('/centroecu.jpg')" }}
      />

      <header className="sticky top-0 z-50 border-b border-brand-border/90 bg-brand-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-base font-semibold tracking-[0.2em] text-brand-primary sm:text-lg">
            EQUIDATA
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-brand-border bg-white/60 px-5 text-sm font-medium text-brand-text transition hover:bg-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
            >
              Registrarme
            </Link>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-100"
          style={{ backgroundImage: "url('/centroecu.jpg')" }}
        />
        <Reveal>
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mx-auto max-w-4xl rounded-3xl border border-brand-border bg-brand-background/88 px-8 py-10 shadow-[0_18px_50px_rgba(31,31,31,0.2)] backdrop-blur-sm sm:px-12 sm:py-12">
              <h1 className="text-5xl font-semibold tracking-tight text-brand-text sm:text-7xl lg:text-8xl">EQUIDATA</h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-brand-text/85 sm:text-2xl">
                un software de gestión hípica
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-7 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
              >
                Empezar ahora
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-brand-border bg-white/60 px-7 text-sm font-medium text-brand-text transition hover:bg-white"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="pb-8 pt-6">
        {features.map((feature, index) => (
          <FeatureCard key={feature.title} feature={feature} index={index} />
        ))}
      </section>

      <Reveal>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:pb-32">
          <div
            className="relative overflow-hidden rounded-3xl border border-brand-border bg-cover bg-center p-8 shadow-[0_20px_70px_rgba(31,31,31,0.14)] backdrop-blur-sm sm:p-12"
            style={{
              backgroundImage: "url('/fondo1.jpg')",
            }}
          >
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-secondary">Siguiente paso</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-brand-text sm:text-5xl">
                  Que te parece, continuamos?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-text/80 sm:text-lg">
                  Accede en segundos y empieza a gestionar tu centro hípico con una experiencia clara, moderna y profesional.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-brand-border bg-white/60 px-7 text-sm font-medium text-brand-text transition hover:bg-white"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-7 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                >
                  Registrarme
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
