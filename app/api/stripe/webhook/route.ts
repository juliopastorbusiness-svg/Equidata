import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getPlanByPriceId } from '@/lib/billing/plans';

export const runtime = 'nodejs';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type StripeMetadata = {
  centerId?: string;
  planId?: string;
  userId?: string;
};

const updateCenterFromSubscription = async (subscription: Stripe.Subscription) => {
  const stripePriceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = stripePriceId ? getPlanByPriceId(stripePriceId) : undefined;
  const centerId = subscription.metadata?.centerId;

  if (!centerId) {
    console.warn('Suscripcion Stripe sin centerId en metadata.');
    return;
  }

  const centerRef = getAdminDb().collection('centers').doc(centerId);
  const centerSnap = await centerRef.get();
  if (!centerSnap.exists) {
    console.warn(`Centro ${centerId} no existe para actualizar suscripcion.`);
    return;
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || null;
  const currentPeriodEndTimestamp = subscription.items.data[0]?.current_period_end ?? null;

  await centerRef.update({
    planId: plan?.id || null,
    subscriptionStatus: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    currentPeriodEnd: currentPeriodEndTimestamp
      ? new Date(currentPeriodEndTimestamp * 1000)
      : null,
    horseLimit: plan?.horseLimit ?? null,
    featureLimit: plan?.featureLimit ?? null,
    billingUpdatedAt: new Date(),
  });
};

const updateCenterFromSubscriptionId = async (
  subscriptionId: string,
  fallbackMetadata?: StripeMetadata
) => {
  if (!stripe) {
    throw new Error('Stripe no esta configurado.');
  }

  let subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (
    fallbackMetadata &&
    (!subscription.metadata?.centerId ||
      !subscription.metadata?.planId ||
      !subscription.metadata?.userId)
  ) {
    subscription = await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        centerId: subscription.metadata?.centerId || fallbackMetadata.centerId || '',
        planId: subscription.metadata?.planId || fallbackMetadata.planId || '',
        userId: subscription.metadata?.userId || fallbackMetadata.userId || '',
      },
    });
  }

  await updateCenterFromSubscription(subscription);
};

export async function POST(request: NextRequest) {
  if (!stripeWebhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET no esta configurada.' }, { status: 500 });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY no esta configurada.' }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Stripe signature missing.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature mismatch:', error);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          await updateCenterFromSubscriptionId(subscriptionId, session.metadata ?? undefined);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateCenterFromSubscription(subscription);
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription =
          invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
        const subscriptionId =
          typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : invoiceSubscription?.id;
        if (subscriptionId) {
          await updateCenterFromSubscriptionId(subscriptionId);
        }
        break;
      }
      default:
        console.log(`Evento Stripe no manejado: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook Stripe:', error);
    return NextResponse.json({ error: 'Error interno al procesar webhook.' }, { status: 500 });
  }
}
