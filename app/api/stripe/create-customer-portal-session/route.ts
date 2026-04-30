import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type UserDoc = {
  activeCenterId?: string | null;
  centerId?: string | null;
  linkedCenters?: string[] | null;
};

type CenterDoc = {
  ownerId?: string | null;
  ownerUid?: string | null;
  stripeCustomerId?: string | null;
};

type MemberDoc = {
  userId?: string | null;
  uid?: string | null;
  role?: string | null;
  status?: string | null;
};

const MANAGER_ROLES = new Set([
  'CENTER_OWNER',
  'center_owner',
  'centerOwner',
  'CENTER_ADMIN',
  'center_staff',
]);

const getBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
};

const resolveCenterId = (userData: UserDoc): string | null => {
  const linkedCenter = Array.isArray(userData.linkedCenters)
    ? userData.linkedCenters.find((centerId) => typeof centerId === 'string' && centerId.trim())
    : null;

  return (
    userData.activeCenterId?.trim() ||
    userData.centerId?.trim() ||
    linkedCenter?.trim() ||
    null
  );
};

const userCanManageCenter = async (centerId: string, userId: string): Promise<boolean> => {
  const db = getAdminDb();
  const centerSnap = await db.collection('centers').doc(centerId).get();

  if (!centerSnap.exists) {
    return false;
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

  const memberData = memberSnap.data() as MemberDoc;
  const memberUserId = memberData.userId || memberData.uid;
  return memberUserId === userId && memberData.status === 'active' && Boolean(memberData.role && MANAGER_ROLES.has(memberData.role));
};

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !stripe) {
    return NextResponse.json({ code: 'STRIPE_NOT_CONFIGURED', error: 'Stripe no esta configurado.' }, { status: 500 });
  }

  if (!appUrl) {
    return NextResponse.json({ code: 'APP_URL_NOT_CONFIGURED', error: 'NEXT_PUBLIC_APP_URL no esta configurada.' }, { status: 500 });
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'Usuario no autenticado.' }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists) {
      return NextResponse.json({ code: 'CENTER_NOT_FOUND', error: 'Centro no encontrado.' }, { status: 404 });
    }

    const centerId = resolveCenterId(userSnap.data() as UserDoc);
    if (!centerId) {
      return NextResponse.json({ code: 'CENTER_NOT_FOUND', error: 'Centro no encontrado.' }, { status: 404 });
    }

    const canManage = await userCanManageCenter(centerId, decodedToken.uid);
    if (!canManage) {
      return NextResponse.json({ code: 'FORBIDDEN', error: 'No tienes permiso para gestionar este centro.' }, { status: 403 });
    }

    const centerSnap = await db.collection('centers').doc(centerId).get();
    if (!centerSnap.exists) {
      return NextResponse.json({ code: 'CENTER_NOT_FOUND', error: 'Centro no encontrado.' }, { status: 404 });
    }

    const centerData = centerSnap.data() as CenterDoc;
    const stripeCustomerId = centerData.stripeCustomerId?.trim();
    if (!stripeCustomerId) {
      return NextResponse.json({ code: 'CUSTOMER_NOT_FOUND', error: 'CUSTOMER_NOT_FOUND' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/dashboard/center/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creando sesion de Customer Portal:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', error: 'No se pudo abrir el portal de facturacion.' }, { status: 500 });
  }
}
