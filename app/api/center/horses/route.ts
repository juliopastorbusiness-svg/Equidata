import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { assertCanCreateHorse, BillingLimitError, getPlanLimits } from '@/lib/billing/limits';

export const runtime = 'nodejs';

type CenterDoc = {
  ownerId?: string | null;
  ownerUid?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  planId?: string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  horseLimit?: number | null;
};

type MemberDoc = {
  userId?: string | null;
  uid?: string | null;
  role?: string | null;
  status?: string | null;
};

type TimestampPayload =
  | { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number }
  | string
  | null
  | undefined;

const MANAGER_ROLES = new Set([
  'CENTER_OWNER',
  'center_owner',
  'centerOwner',
  'CENTER_ADMIN',
  'center_staff',
]);

const errorStatusByCode: Record<string, number> = {
  PLAN_NOT_ACTIVE: 402,
  HORSE_LIMIT_REACHED: 409,
  CENTER_NOT_FOUND: 404,
};

const getBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
};

const userCanManageCenter = async (centerId: string, userId: string): Promise<boolean> => {
  const db = getAdminDb();
  const centerSnap = await db.collection('centers').doc(centerId).get();

  if (!centerSnap.exists) {
    throw new BillingLimitError('CENTER_NOT_FOUND', 'Centro no encontrado.');
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

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const trimArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const toTimestampOrNull = (value: TimestampPayload): admin.firestore.Timestamp | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : admin.firestore.Timestamp.fromDate(date);
  }

  const seconds = value.seconds ?? value._seconds;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;

  if (typeof seconds !== 'number') {
    return null;
  }

  return new admin.firestore.Timestamp(seconds, nanoseconds);
};

const normalizeContact = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const name = trimOrNull(data.name);
  if (!name) {
    return null;
  }

  return {
    name,
    phone: trimOrNull(data.phone),
    email: trimOrNull(data.email),
    address: trimOrNull(data.address),
  };
};

const normalizeHorsePayload = (payload: Record<string, unknown>) => {
  const name = trimOrNull(payload.name);
  if (!name || name.length < 2) {
    throw new Error('El nombre del caballo debe tener al menos 2 caracteres.');
  }

  return {
    name,
    status: typeof payload.status === 'string' ? payload.status : 'ACTIVE',
    ownerId: trimOrNull(payload.ownerId),
    riderId: trimOrNull(payload.riderId),
    stableId: trimOrNull(payload.stableId),
    breed: trimOrNull(payload.breed),
    coat: trimOrNull(payload.coat),
    sex: typeof payload.sex === 'string' ? payload.sex : 'UNKNOWN',
    birthDate: toTimestampOrNull(payload.birthDate as TimestampPayload),
    enteredCenterAt: toTimestampOrNull(payload.enteredCenterAt as TimestampPayload),
    age: toNumberOrNull(payload.age),
    heightCm: toNumberOrNull(payload.heightCm),
    weightKg: toNumberOrNull(payload.weightKg),
    microchipId: trimOrNull(payload.microchipId),
    federationId: trimOrNull(payload.federationId),
    photoUrl: trimOrNull(payload.photoUrl),
    notes: trimOrNull(payload.notes),
    tags: trimArray(payload.tags),
    ownerContact: normalizeContact(payload.ownerContact),
    emergencyContact: normalizeContact(payload.emergencyContact),
    veterinarianName: trimOrNull(payload.veterinarianName),
    veterinarianContact: normalizeContact(payload.veterinarianContact),
    farrierName: trimOrNull(payload.farrierName),
    farrierContact: normalizeContact(payload.farrierContact),
    trainerName: trimOrNull(payload.trainerName),
    nextFarrierVisitAt: toTimestampOrNull(payload.nextFarrierVisitAt as TimestampPayload),
  };
};

const isBillingActive = (center: CenterDoc): boolean => {
  const plan = getPlanLimits(center.planId);
  if (!plan || (center.status !== 'active' && center.isActive !== true)) {
    return false;
  }

  if (center.subscriptionStatus) {
    return center.subscriptionStatus === 'active';
  }

  return Boolean(center.stripeCustomerId && center.stripePriceId);
};

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'Usuario no autenticado.' }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const body = (await request.json()) as { centerId?: string; horse?: Record<string, unknown> };
    const centerId = body.centerId?.trim();

    if (!centerId || !body.horse) {
      return NextResponse.json({ code: 'INVALID_REQUEST', error: 'centerId y horse son obligatorios.' }, { status: 400 });
    }

    const hasPermission = await userCanManageCenter(centerId, decodedToken.uid);
    if (!hasPermission) {
      return NextResponse.json({ code: 'FORBIDDEN', error: 'No tienes permiso para gestionar este centro.' }, { status: 403 });
    }

    const nextHorse = normalizeHorsePayload(body.horse);
    await assertCanCreateHorse(centerId);

    const db = getAdminDb();
    const horseId = await db.runTransaction(async (transaction) => {
      const centerRef = db.collection('centers').doc(centerId);
      const centerSnap = await transaction.get(centerRef);

      if (!centerSnap.exists) {
        throw new BillingLimitError('CENTER_NOT_FOUND', 'Centro no encontrado.');
      }

      const center = centerSnap.data() as CenterDoc;
      const plan = getPlanLimits(center.planId);

      if (!isBillingActive(center)) {
        throw new BillingLimitError('PLAN_NOT_ACTIVE', 'Tu plan no esta activo.');
      }

      const horseLimit =
        typeof center.horseLimit === 'number'
          ? center.horseLimit
          : plan?.horseLimit ?? null;
      const horsesSnap = await transaction.get(centerRef.collection('horses'));

      if (horseLimit !== null) {
        const allowed = horsesSnap.size < horseLimit;
        console.info('Horse limit transaction check', {
          centerId,
          horseLimit,
          currentHorseCount: horsesSnap.size,
          allowed,
        });

        if (horsesSnap.size >= horseLimit) {
          throw new BillingLimitError(
            'HORSE_LIMIT_REACHED',
            'Has alcanzado el límite de caballos de tu plan.'
          );
        }
      } else {
        console.info('Horse limit transaction check', {
          centerId,
          horseLimit,
          currentHorseCount: horsesSnap.size,
          allowed: true,
        });
      }

      const horseRef = centerRef.collection('horses').doc();
      transaction.set(horseRef, {
        ...nextHorse,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return horseRef.id;
    });

    return NextResponse.json({ horseId });
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: errorStatusByCode[error.code] ?? 400 }
      );
    }

    console.error('Error creando caballo:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: error instanceof Error ? error.message : 'Error interno.' },
      { status: 500 }
    );
  }
}
