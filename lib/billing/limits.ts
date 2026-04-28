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
};

type CenterBillingDoc = {
  planId?: string | null;
  status?: string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
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
  if (!planId || center.status !== 'active') {
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

  return {
    centerId,
    planId: plan?.planId ?? null,
    status: center.status ?? null,
    subscriptionStatus: center.subscriptionStatus ?? null,
    isActive: isBillingActive(center, plan?.planId ?? null),
    horseLimit: plan?.horseLimit ?? center.horseLimit ?? null,
    featureLimit: plan?.featureLimit ?? center.featureLimit ?? null,
    horseCount: horseSnap.size,
    enabledModules,
  };
};

export const canCreateHorse = async (centerId: string): Promise<boolean> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    return false;
  }

  return billing.horseLimit === null || billing.horseCount < billing.horseLimit;
};

export const assertCanCreateHorse = async (centerId: string): Promise<void> => {
  const billing = await getCenterBillingState(centerId);

  if (!billing.isActive) {
    throw new BillingLimitError(
      'PLAN_NOT_ACTIVE',
      'Tu plan no esta activo.'
    );
  }

  if (billing.horseLimit !== null && billing.horseCount >= billing.horseLimit) {
    throw new BillingLimitError(
      'HORSE_LIMIT_REACHED',
      'Has alcanzado el limite de caballos de tu plan.'
    );
  }
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
