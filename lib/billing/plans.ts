export type PlanId = 'basic' | 'pro' | 'unlimited';

export type PlanConfig = {
  id: PlanId;
  name: string;
  stripePriceId: string;
  price: number;
  currency: 'eur';
  interval: 'month';
  horseLimit: number | null;
  featureLimit: number | null;
};

export type StripePlanMapping = {
  planId: PlanId;
  horseLimit: number | null;
  featureLimit: number | null;
};

export const PRICE_MAP: Record<PlanId, string> = {
  basic: 'price_1TRGMnQt1IK85UUT0ozQTxxl',
  pro: 'price_1TRGMnQt1IK85UUTxlzlQJd5',
  unlimited: 'price_1TRGMnQt1IK85UUTYlOv7cgy',
};

export const PLAN_CONFIG: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Equidata Basico',
    stripePriceId: PRICE_MAP.basic,
    price: 24.99,
    currency: 'eur',
    interval: 'month',
    horseLimit: 20,
    featureLimit: 3,
  },
  {
    id: 'pro',
    name: 'Equidata Profesional',
    stripePriceId: PRICE_MAP.pro,
    price: 49.99,
    currency: 'eur',
    interval: 'month',
    horseLimit: 50,
    featureLimit: null,
  },
  {
    id: 'unlimited',
    name: 'Equidata Ilimitado',
    stripePriceId: PRICE_MAP.unlimited,
    price: 79.99,
    currency: 'eur',
    interval: 'month',
    horseLimit: null,
    featureLimit: null,
  },
];

export const getPlanById = (planId: string): PlanConfig | undefined => {
  return PLAN_CONFIG.find((plan) => plan.id === planId);
};

export function mapPriceToPlan(priceId: string): StripePlanMapping {
  switch (priceId) {
    case PRICE_MAP.basic:
      return {
        planId: 'basic',
        horseLimit: 20,
        featureLimit: 3,
      };

    case PRICE_MAP.pro:
      return {
        planId: 'pro',
        horseLimit: 50,
        featureLimit: null,
      };

    case PRICE_MAP.unlimited:
      return {
        planId: 'unlimited',
        horseLimit: null,
        featureLimit: null,
      };

    default:
      throw new Error(`PRICE_NOT_RECOGNIZED: ${priceId}`);
  }
}
