export default function BillingCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-16 text-brand-text">
      <div className="w-full rounded-3xl border border-brand-border bg-brand-background/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-bold">Pago cancelado. Puedes elegir otro plan.</h1>
        <p className="mt-4 text-base text-brand-text/80">
          No se ha activado ningún plan. Puedes volver a pricing y elegir otra opción cuando quieras.
        </p>
      </div>
    </main>
  );
}
