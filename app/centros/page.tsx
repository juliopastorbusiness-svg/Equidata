"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CenterSearchList } from "@/components/centers/CenterSearchList";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { searchCenters } from "@/lib/services/centerService";
import { getUserCenterMemberships } from "@/lib/services/memberService";
import { Center, CenterMember, RiderProfile } from "@/lib/services/types";

export default function CentersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, error: authError } = useAuthUser();

  const [queryText, setQueryText] = useState("");
  const [city, setCity] = useState("");
  const [centers, setCenters] = useState<Center[]>([]);
  const [memberships, setMemberships] = useState<CenterMember[]>([]);
  const [activeCenterId, setActiveCenterIdState] = useState<string | undefined>(
    profile?.activeCenterId
  );
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const riderProfile = profile?.role === "rider" ? (profile as RiderProfile) : null;

  const loadCenters = useCallback(async (nextQuery = queryText, nextCity = city) => {
    const normalizedQuery = nextQuery.trim();
    if (!normalizedQuery) {
      setCenters([]);
      setHasSearched(false);
      setLoadingSearch(false);
      setError(null);
      return;
    }

    setLoadingSearch(true);
    setError(null);
    setHasSearched(true);

    try {
      const centerRows = await searchCenters({ query: normalizedQuery, city: nextCity, status: "active" });
      setCenters(centerRows);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudieron cargar los centros.");
    } finally {
      setLoadingSearch(false);
    }
  }, [city, queryText]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    void (async () => {
      setLoadingMemberships(true);
      setError(null);
      try {
        const memberRows = await getUserCenterMemberships(user.uid);
        setMemberships(memberRows);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudieron cargar los centros.");
      } finally {
        setLoadingMemberships(false);
      }
    })();
  }, [authLoading, router, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (!queryText.trim()) {
      setCenters([]);
      setHasSearched(false);
      setLoadingSearch(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadCenters(queryText, city);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, city, loadCenters, queryText, user]);

  useEffect(() => {
    setActiveCenterIdState(profile?.activeCenterId);
  }, [profile?.activeCenterId]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    await loadCenters();
  };

  const handleMemberChange = (member: CenterMember) => {
    setMemberships((prev) => {
      const next = prev.filter((item) => item.centerId !== member.centerId);
      next.push(member);
      return next;
    });
  };

  const handleActiveCenterChange = (centerId: string) => {
    setActiveCenterIdState(centerId);
  };

  if (authLoading || loadingMemberships) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando centros...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-brand-border bg-white/75 p-6 shadow-sm">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Centros</p>
            <h1 className="mt-2 text-3xl font-semibold">Busca y solicita vinculacion</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-secondary">
              Encuentra centros por nombre o ciudad y revisa el estado de acceso de tu perfil rider.
            </p>
          </div>
          <Link
            href={profile?.role === "pro" ? "/dashboard/pro" : "/dashboard/rider"}
            className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white"
          >
            Volver al dashboard
          </Link>
        </header>

        <section className="rounded-3xl border border-brand-border bg-white/75 p-6 shadow-sm">
          <form onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto]">
            <div>
              <label htmlFor="center-query" className="block text-sm font-medium text-brand-secondary">
                Nombre del centro
              </label>
              <input
                id="center-query"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="Ej. Jerez, Cartuja, Escuela..."
                className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="center-city" className="block text-sm font-medium text-brand-secondary">
                Ciudad
              </label>
              <input
                id="center-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ej. Sevilla"
                className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center self-end rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </form>
        </section>

        {authError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {authError}
          </p>
        ) : null}
        {!riderProfile ? (
          <p className="rounded-xl border border-amber-700 bg-amber-50 p-3 text-sm text-amber-800">
            Esta pantalla permite solicitar vinculaciones solo con perfiles rider.
          </p>
        ) : null}

        <CenterSearchList
          centers={centers}
          loading={loadingSearch}
          error={error}
          hasSearched={hasSearched}
          memberships={memberships}
          riderProfile={riderProfile}
          activeCenterId={activeCenterId}
          onMemberChange={handleMemberChange}
          onActiveCenterChange={handleActiveCenterChange}
        />
      </div>
    </main>
  );
}
