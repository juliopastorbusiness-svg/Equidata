import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type UserDoc = {
  activeCenterId?: string | null;
  centerId?: string | null;
  linkedCenters?: string[] | null;
};

type CenterDoc = {
  planId?: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
};

type SubscriptionStatusResponse =
  | { status: 'pending'; planId?: string }
  | { status: 'active'; planId: string }
  | { status: 'error'; planId?: string };

const jsonResponse = (
  body: SubscriptionStatusResponse,
  init?: ResponseInit
) => NextResponse.json(body, init);

const getBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
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

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ status: 'error' }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const db = getAdminDb();

    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!userSnap.exists) {
      return jsonResponse({ status: 'error' }, { status: 404 });
    }

    const centerId = resolveCenterId(userSnap.data() as UserDoc);
    if (!centerId) {
      return jsonResponse({ status: 'error' }, { status: 404 });
    }

    const centerSnap = await db.collection('centers').doc(centerId).get();
    if (!centerSnap.exists) {
      return jsonResponse({ status: 'error' }, { status: 404 });
    }

    const centerData = centerSnap.data() as CenterDoc;
    const planId = centerData.planId?.trim() || undefined;
    const subscriptionStatus = centerData.subscriptionStatus?.trim();

    if (subscriptionStatus === 'active') {
      if (!planId || !centerData.stripeSubscriptionId) {
        return jsonResponse({ status: 'error', planId });
      }

      return jsonResponse({ status: 'active', planId });
    }

    return jsonResponse(planId ? { status: 'pending', planId } : { status: 'pending' });
  } catch (error) {
    console.error('Error consultando estado de suscripcion:', error);
    return jsonResponse({ status: 'error' }, { status: 500 });
  }
}
