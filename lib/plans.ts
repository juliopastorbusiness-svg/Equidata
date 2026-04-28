export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    horses: number;
    modules: number | 'unlimited';
  };
}

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 24.99,
    currency: 'eur',
    interval: 'month',
    features: ['Registrar hasta 20 caballos', '3 módulos a elegir'],
    limits: {
      horses: 20,
      modules: 3,
    },
  },
  {
    id: 'pro',
    name: 'Profesional',
    price: 49.99,
    currency: 'eur',
    interval: 'month',
    features: ['Hasta 50 caballos', 'Todas las funcionalidades'],
    limits: {
      horses: 50,
      modules: 'unlimited',
    },
  },
  {
    id: 'unlimited',
    name: 'Ilimitado',
    price: 79.99,
    currency: 'eur',
    interval: 'month',
    features: ['Caballos ilimitados', 'Todas las funcionalidades'],
    limits: {
      horses: Infinity,
      modules: 'unlimited',
    },
  },
];

export const getPlanById = (id: string): Plan | undefined => {
  return plans.find(plan => plan.id === id);
};