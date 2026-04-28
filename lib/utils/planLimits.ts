import { getPlanById } from '@/lib/billing/plans';

export const canAddHorse = (planId: string | null, currentHorseCount: number): boolean => {
  if (!planId) return false;
  const plan = getPlanById(planId);
  if (!plan) return false;
  return plan.horseLimit === null || currentHorseCount < plan.horseLimit;
};

export const canUseModule = (planId: string | null, moduleCount: number): boolean => {
  if (!planId) return false;
  const plan = getPlanById(planId);
  if (!plan) return false;
  return plan.featureLimit === null || moduleCount < plan.featureLimit;
};

export const getHorseLimit = (planId: string | null): number => {
  if (!planId) return 0;
  const plan = getPlanById(planId);
  if (!plan) return 0;
  return plan.horseLimit === null ? Infinity : plan.horseLimit;
};

export const getModuleLimit = (planId: string | null): number | 'unlimited' => {
  if (!planId) return 0;
  const plan = getPlanById(planId);
  if (!plan) return 0;
  return plan.featureLimit === null ? 'unlimited' : plan.featureLimit;
};