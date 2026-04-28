import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { BillingLimitError, getCenterBillingState } from '@/lib/billing/limits';

export const runtime = 'nodejs';

type UserDoc = {
  activeCenterId?: string | null;
  centerId?: string | null;
  linkedCenters?: string[] | null;
};

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

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'Usuario no autenticado.' }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const userSnap = await getAdminDb().collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists) {
      return NextResponse.json({ code: 'CENTER_NOT_FOUND', error: 'Centro no encontrado.' }, { status: 404 });
    }

    const centerId = resolveCenterId(userSnap.data() as UserDoc);
    if (!centerId) {
      return NextResponse.json({ code: 'CENTER_NOT_FOUND', error: 'Centro no encontrado.' }, { status: 404 });
    }

    const billing = await getCenterBillingState(centerId);
    return NextResponse.json(billing);
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.code === 'CENTER_NOT_FOUND' ? 404 : 400 }
      );
    }

    console.error('Error leyendo estado del plan:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', error: 'Error interno.' }, { status: 500 });
  }
}
