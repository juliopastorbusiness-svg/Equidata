import { getAdminDb } from '@/lib/firebaseAdmin';
import { ModuleId } from '@/lib/modules/moduleConfig';

export type PlanId = 'basic' | 'pro' | 'unlimited';

export type PlanLimits = {
  planId: PlanId;
  horseLimit: number | null;
  featureLimit: number | null;
};

export type BillingErrorCode =
  | 'PLAN_NOT_ACTIVE'
  | 'HORSE_LIMIT_REACHED'
  | 'FEATURE_LIMIT_REACHED'
  | 'CENTER_NOT_FOUND';

export class BillingLimitError extends Error {
  constructor(
    public code: BillingErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BillingLimitError';
  }
}

export type CenterBillingState = {
  centerId: string;
  planId: PlanId | null;
  status: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  horseLimit: number | null;
  featureLimit: number | null;
  horseCount: number;
  enabledModules: ModuleId[];
  currentPeriodEnd: Date | null;
};

type CenterBillingDoc = {
  planId?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: FirebaseFirestore.Timestamp | Date | null;
  horseLimit?: number | null;
  featureLimit?: number | null;
  enabledModules?: string[] | null;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  basic: {
    planId: 'basic',
    horseLimit: 20,
    featureLimit: 3,
  },
  pro: {
    planId: 'pro',
    horseLimit: 50,
    featureLimit: null,
  },
  unlimited: {
    planId: 'unlimited',
    horseLimit: null,
    featureLimit: null,
  },
};

export const getPlanLimits = (planId?: string | null): PlanLimits | null => {
  if (!planId || !(planId in PLAN_LIMITS)) {
    return null;
  }

  return PLAN_LIMITS[planId as PlanId];
};

const normalizeModules = (value?: string[] | null): ModuleId[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((moduleId): moduleId is ModuleId => typeof moduleId === 'string'))
  );
};

const isBillingActive = (center: CenterBillingDoc, planId: PlanId | null): boolean => {
  if (!planId || (center.status !== 'active' && center.isActive !== true)) {
    return false;
  }

  if (center.subscriptionStatus) {
    return center.subscriptionStatus === 'active';
  }

  return Boolean(center.stripeCustomerId && center.stripePriceId);
};

export const getCenterBillingState = async (
  centerId: string
): Promise<CenterBillingState> => {
  const db = getAdminDb();
  const centerSnap = await db.collection('centers').doc(centerId).get();

  if (!centerSnap.exists) {
    throw new BillingLimitError('CENTER_NOT_FOUND', 'Centro no encontrado.');
  }

  const center = centerSnap.data() as CenterBillingDoc;
  const plan = getPlanLimits(center.planId);
  const horseSnap = await db.collection('centers').doc(centerId).collection('horses').get();
  const enabledModules = normalizeModules(center.enabledModules);
  const horseLimit =
    typeof center.horseLimit === 'number'
      ? center.horseLimit
      : plan?.horseLimit ?? null;

  return {
    centerId,
    planId: plan?.planId ?? null,
    status: center.status ?? null,
    subscriptionStatus: center.subscriptionStatus ?? null,
    isActive: isBillingActive(center, plan?.planId ?? null),
    horseLimit,
    featureLimit: plan?.featureLimit ?? center.featureLimit ?? null,
    horseCount: horseSnap.size,
    enabledModules,
    currentPeriodEnd: center.currentPeriodEnd
      ? center.currentPeriodEnd instanceof Date
        ? center.currentPeriodEnd
        : center.currentPeriodEnd.toDate()
      : null,
  };
};

export const canCreateHorse = async (centerId: string): Promise<boolean> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    console.info('Horse limit check', {
      centerId,
      horseLimit: billing.horseLimit,
      currentHorseCount: billing.horseCount,
      allowed: false,
    });
    return false;
  }

  const allowed = billing.horseLimit === null || billing.horseCount < billing.horseLimit;
  console.info('Horse limit check', {
    centerId,
    horseLimit: billing.horseLimit,
    currentHorseCount: billing.horseCount,
    allowed,
  });
  return allowed;
};

export const assertCanCreateHorse = async (centerId: string): Promise<void> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    console.info('Horse limit check', {
      centerId,
      horseLimit: billing.horseLimit,
      currentHorseCount: billing.horseCount,
      allowed: false,
    });
    throw new BillingLimitError(
      'PLAN_NOT_ACTIVE',
      'Tu plan no esta activo.'
    );
  }

  if (billing.horseLimit !== null && billing.horseCount >= billing.horseLimit) {
    console.info('Horse limit check', {
      centerId,
      horseLimit: billing.horseLimit,
      currentHorseCount: billing.horseCount,
      allowed: false,
    });
    throw new BillingLimitError(
      'HORSE_LIMIT_REACHED',
      'Has alcanzado el límite de caballos de tu plan.'
    );
  }

  console.info('Horse limit check', {
    centerId,
    horseLimit: billing.horseLimit,
    currentHorseCount: billing.horseCount,
    allowed: true,
  });
};

export const canEnableFeature = async (
  centerId: string,
  featureKey: string
): Promise<boolean> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    return false;
  }

  if (billing.enabledModules.includes(featureKey as ModuleId)) {
    return true;
  }

  return billing.featureLimit === null || billing.enabledModules.length < billing.featureLimit;
};

export const assertCanEnableFeature = async (
  centerId: string,
  featureKey: string
): Promise<void> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    throw new BillingLimitError(
      'PLAN_NOT_ACTIVE',
      'Tu plan no esta activo.'
    );
  }

  if (billing.enabledModules.includes(featureKey as ModuleId)) {
    return;
  }

  if (billing.featureLimit !== null && billing.enabledModules.length >= billing.featureLimit) {
    throw new BillingLimitError(
      'FEATURE_LIMIT_REACHED',
      'Tu plan actual no permite activar mas funcionalidades.'
    );
  }
};
