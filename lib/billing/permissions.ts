import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPlanById } from '@/lib/billing/plans';
import type { Center } from '@/lib/services/types';

export type CenterSubscription = {
  centerId: string;
  planId: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
  horseLimit: number | null;
  featureLimit: number | null;
  billingUpdatedAt: Date | null;
  enabledModules: string[];
};

const toDateOrNull = (value: Date | Timestamp | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return null;
};

const getCenterDoc = async (centerId: string) => {
  const centerRef = doc(db, 'centers', centerId);
  const centerSnap = await getDoc(centerRef);
  if (!centerSnap.exists()) {
    throw new Error('Centro no encontrado.');
  }
  return centerSnap.data() as Center & { enabledModules?: string[] };
};

export const getCenterSubscription = async (
  centerId: string
): Promise<CenterSubscription> => {
  const centerDoc = await getCenterDoc(centerId);
  const plan = centerDoc.planId ? getPlanById(centerDoc.planId) : undefined;

  return {
    centerId,
    planId: centerDoc.planId || null,
    subscriptionStatus: centerDoc.subscriptionStatus || null,
    stripeCustomerId: centerDoc.stripeCustomerId || null,
    stripeSubscriptionId: centerDoc.stripeSubscriptionId || null,
    stripePriceId: centerDoc.stripePriceId || null,
    currentPeriodEnd: toDateOrNull(centerDoc.currentPeriodEnd),
    horseLimit: plan?.horseLimit ?? centerDoc.horseLimit ?? null,
    featureLimit: plan?.featureLimit ?? centerDoc.featureLimit ?? null,
    billingUpdatedAt: toDateOrNull(centerDoc.billingUpdatedAt),
    enabledModules: centerDoc.enabledModules || [],
  };
};

export const canCreateHorse = async (centerId: string): Promise<boolean> => {
  const subscription = await getCenterSubscription(centerId);

  if (subscription.horseLimit === null) {
    return true;
  }

  const horseSnapshot = await getDocs(collection(db, 'centers', centerId, 'horses'));
  return horseSnapshot.size < subscription.horseLimit;
};

export const assertCanCreateHorse = async (centerId: string): Promise<void> => {
  const allowed = await canCreateHorse(centerId);
  if (!allowed) {
    throw new Error('El limite de caballos para tu plan ha sido alcanzado.');
  }
};

export const canEnableFeature = async (
  centerId: string,
  featureKey: string
): Promise<boolean> => {
  const subscription = await getCenterSubscription(centerId);

  if (subscription.featureLimit === null) {
    return true;
  }

  const enabled = subscription.enabledModules;
  if (enabled.includes(featureKey)) {
    return true;
  }

  return enabled.length < subscription.featureLimit;
};

export const assertCanEnableFeature = async (
  centerId: string,
  featureKey: string
): Promise<void> => {
  const allowed = await canEnableFeature(centerId, featureKey);
  if (!allowed) {
    throw new Error('Has alcanzado el limite de funcionalidades permitidas por tu plan.');
  }
};
