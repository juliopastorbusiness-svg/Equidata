export const isDev = (): boolean => process.env.NODE_ENV === "development";

export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
export const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

