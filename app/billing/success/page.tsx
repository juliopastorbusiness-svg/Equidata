export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-16 text-brand-text">
      <div className="w-full rounded-3xl border border-brand-border bg-brand-background/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-bold">Pago completado. Estamos activando tu plan.</h1>
        <p className="mt-4 text-base text-brand-text/80">
          La activación no depende del frontend. Se completará cuando Stripe confirme la suscripción mediante el webhook y Firestore actualice tu centro.
        </p>
        <p className="mt-6 text-sm text-brand-text/70">
          Si no lo ves reflejado al instante, espera unos minutos y vuelve a entrar en billing.
        </p>
      </div>
    </main>
  );
}
