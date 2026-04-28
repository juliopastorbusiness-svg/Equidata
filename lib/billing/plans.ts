export type PlanConfig = {
  id: string;
  name: string;
  stripePriceId: string;
  price: number;
  currency: 'eur';
  interval: 'month';
  horseLimit: number | null;
  featureLimit: number | null;
};

export const PLAN_CONFIG: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Equidata Básico',
    stripePriceId: 'price_1TQt96Qt1lK85UUT8VFwgqFV',
    price: 24.99,
    currency: 'eur',
    interval: 'month',
    horseLimit: 20,
    featureLimit: 3,
  },
  {
    id: 'pro',
    name: 'Equidata Profesional',
    stripePriceId: 'price_1TQt9yQt1lK85UUTY8qKBMZf',
    price: 49.99,
    currency: 'eur',
    interval: 'month',
    horseLimit: 50,
    featureLimit: null,
  },
  {
    id: 'unlimited',
    name: 'Equidata Ilimitado',
    stripePriceId: 'price_1TQtB0Qt1lK85UUTGCmueBQd',
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

export const getPlanByPriceId = (priceId: string): PlanConfig | undefined => {
  return PLAN_CONFIG.find((plan) => plan.stripePriceId === priceId);
};
