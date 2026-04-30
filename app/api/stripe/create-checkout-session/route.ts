import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { getPlanById, PRICE_MAP } from '@/lib/billing/plans';

export const runtime = 'nodejs';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type CenterDoc = {
  ownerId?: string | null;
  ownerUid?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
};

const MANAGER_ROLES = new Set([
  'CENTER_OWNER',
  'center_owner',
  'centerOwner',
  'CENTER_ADMIN',
  'center_staff',
]);

const verifyAuthToken = async (request: NextRequest): Promise<string> => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authorization header invalido.');
  }

  const idToken = authHeader.split(' ')[1];
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  return decodedToken.uid;
};

const userCanManageCenter = async (centerId: string, userId: string): Promise<boolean> => {
  const db = getAdminDb();
  const centerSnap = await db.collection('centers').doc(centerId).get();

  if (!centerSnap.exists) {
    throw new Error('Centro no encontrado.');
  }

  const centerData = centerSnap.data() as CenterDoc;
  const ownerId = centerData.ownerId || centerData.ownerUid;
  if (ownerId === userId) {
    return true;
  }

  const memberSnap = await db.collection('centers').doc(centerId).collection('members').doc(userId).get();
  if (!memberSnap.exists) {
    return false;
  }

  const memberData = memberSnap.data() as {
    userId?: string | null;
    uid?: string | null;
    role?: string | null;
    status?: string | null;
  };

  const memberUserId = memberData.userId || memberData.uid;
  return memberUserId === userId && memberData.status === 'active' && Boolean(memberData.role && MANAGER_ROLES.has(memberData.role));
};

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY no esta configurada.' }, { status: 500 });
  }

  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no esta configurada.' }, { status: 500 });
  }

  try {
    const userId = await verifyAuthToken(request);
    const body = await request.json();
    const { centerId, planId } = body as { centerId?: string; planId?: string };

    if (!centerId || !planId) {
      return NextResponse.json({ error: 'centerId y planId son obligatorios.' }, { status: 400 });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan invalido.' }, { status: 400 });
    }
    const stripePriceId = PRICE_MAP[plan.id];

    const centerRef = getAdminDb().collection('centers').doc(centerId);
    const centerSnap = await centerRef.get();
    if (!centerSnap.exists) {
      return NextResponse.json({ error: 'Centro no encontrado.' }, { status: 404 });
    }

    const hasPermission = await userCanManageCenter(centerId, userId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'No tienes permiso para gestionar este centro.' }, { status: 403 });
    }

    const centerData = centerSnap.data() as CenterDoc;
    const customerConfig = centerData.stripeCustomerId
      ? { customer: centerData.stripeCustomerId }
      : { customer_email: centerData.email ?? undefined };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          centerId,
          planId,
          userId,
        },
      },
      metadata: {
        centerId,
        planId,
        userId,
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      client_reference_id: userId,
      ...customerConfig,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creando sesion de checkout:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    const status =
      message === 'Authorization header invalido.'
        ? 401
        : message === 'Centro no encontrado.'
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
