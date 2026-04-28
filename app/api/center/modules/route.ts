import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import {
  BillingLimitError,
  getPlanLimits,
  PLAN_LIMITS,
} from '@/lib/billing/limits';
import {
  getAllDependentModules,
  getModuleDependencies,
  ModuleId,
  MODULE_REGISTRY,
  validateModuleSet,
} from '@/lib/modules/moduleConfig';

export const runtime = 'nodejs';

type CenterDoc = {
  ownerId?: string | null;
  ownerUid?: string | null;
  status?: string | null;
  planId?: string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  featureLimit?: number | null;
  enabledModules?: string[] | null;
};

type MemberDoc = {
  userId?: string | null;
  uid?: string | null;
  role?: string | null;
  status?: string | null;
};

type ModulesRequest =
  | {
      action: 'enable';
      centerId?: string;
      moduleId?: ModuleId;
      autoActivateDependencies?: boolean;
    }
  | {
      action: 'disable';
      centerId?: string;
      moduleId?: ModuleId;
      force?: boolean;
    }
  | {
      action: 'set';
      centerId?: string;
      moduleIds?: ModuleId[];
    };

const MANAGER_ROLES = new Set([
  'CENTER_OWNER',
  'center_owner',
  'centerOwner',
  'CENTER_ADMIN',
  'center_staff',
]);

const errorStatusByCode: Record<string, number> = {
  PLAN_NOT_ACTIVE: 402,
  FEATURE_LIMIT_REACHED: 409,
  CENTER_NOT_FOUND: 404,
};

const getBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
};

const isModuleId = (value: unknown): value is ModuleId =>
  typeof value === 'string' && value in MODULE_REGISTRY;

const normalizeModules = (value?: string[] | null): ModuleId[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(isModuleId)));
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

const isBillingActive = (center: CenterDoc): boolean => {
  const plan = getPlanLimits(center.planId);
  if (!plan || center.status !== 'active') {
    return false;
  }

  if (center.subscriptionStatus) {
    return center.subscriptionStatus === 'active';
  }

  return Boolean(center.stripeCustomerId && center.stripePriceId);
};

const assertFeatureLimit = (
  center: CenterDoc,
  currentModules: ModuleId[],
  nextModules: ModuleId[]
) => {
  const addedModules = nextModules.filter((moduleId) => !currentModules.includes(moduleId));
  if (addedModules.length === 0) {
    return;
  }

  if (!isBillingActive(center)) {
    throw new BillingLimitError('PLAN_NOT_ACTIVE', 'Tu plan no esta activo.');
  }

  const plan = getPlanLimits(center.planId);
  const featureLimit = plan?.featureLimit ?? center.featureLimit ?? null;

  if (featureLimit !== null && nextModules.length > featureLimit) {
    throw new BillingLimitError(
      'FEATURE_LIMIT_REACHED',
      'Tu plan actual no permite activar mas funcionalidades.'
    );
  }
};

const buildEnabledModules = (
  currentModules: ModuleId[],
  moduleId: ModuleId,
  autoActivateDependencies: boolean
): ModuleId[] => {
  if (currentModules.includes(moduleId)) {
    return currentModules;
  }

  if (!autoActivateDependencies) {
    const missingDeps = getModuleDependencies(moduleId).filter((dep) => !currentModules.includes(dep));
    if (missingDeps.length > 0) {
      throw new Error(`Este modulo requiere: ${missingDeps.map((dep) => MODULE_REGISTRY[dep].title).join(', ')}`);
    }
    return Array.from(new Set([...currentModules, moduleId]));
  }

  return Array.from(
    new Set([...currentModules, moduleId, ...getModuleDependencies(moduleId)])
  );
};

const buildDisabledModules = (
  currentModules: ModuleId[],
  moduleId: ModuleId,
  force: boolean
) => {
  if (!currentModules.includes(moduleId)) {
    return { nextModules: currentModules, disabled: [] as ModuleId[] };
  }

  const affectedModules = getAllDependentModules(moduleId).filter((dependent) =>
    currentModules.includes(dependent)
  );

  if (affectedModules.length > 0 && !force) {
    return {
      nextModules: currentModules,
      disabled: [] as ModuleId[],
      affectedModules,
      error: `Si desactivas este modulo, tambien se veran afectados: ${affectedModules.map((affected) => MODULE_REGISTRY[affected].title).join(', ')}`,
    };
  }

  const toDisable = force ? [moduleId, ...affectedModules] : [moduleId];
  return {
    nextModules: currentModules.filter((current) => !toDisable.includes(current)),
    disabled: toDisable,
  };
};

export async function PATCH(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'Usuario no autenticado.' }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const body = (await request.json()) as ModulesRequest;
    const centerId = body.centerId?.trim();

    if (!centerId) {
      return NextResponse.json({ code: 'INVALID_REQUEST', error: 'centerId es obligatorio.' }, { status: 400 });
    }

    const hasPermission = await userCanManageCenter(centerId, decodedToken.uid);
    if (!hasPermission) {
      return NextResponse.json({ code: 'FORBIDDEN', error: 'No tienes permiso para gestionar este centro.' }, { status: 403 });
    }

    const db = getAdminDb();
    const result = await db.runTransaction(async (transaction) => {
      const centerRef = db.collection('centers').doc(centerId);
      const centerSnap = await transaction.get(centerRef);

      if (!centerSnap.exists) {
        throw new BillingLimitError('CENTER_NOT_FOUND', 'Centro no encontrado.');
      }

      const center = centerSnap.data() as CenterDoc;
      const currentModules = normalizeModules(center.enabledModules);
      let nextModules = currentModules;
      let activated: ModuleId[] = [];
      let disabled: ModuleId[] = [];
      let affectedModules: ModuleId[] | undefined;

      if (body.action === 'enable') {
        if (!isModuleId(body.moduleId)) {
          throw new Error('Modulo invalido.');
        }
        nextModules = buildEnabledModules(
          currentModules,
          body.moduleId,
          body.autoActivateDependencies !== false
        );
        activated = nextModules.filter((moduleId) => !currentModules.includes(moduleId));
      } else if (body.action === 'disable') {
        if (!isModuleId(body.moduleId)) {
          throw new Error('Modulo invalido.');
        }
        const disableResult = buildDisabledModules(currentModules, body.moduleId, Boolean(body.force));
        if (disableResult.error) {
          return {
            success: false,
            error: disableResult.error,
            activated,
            disabled,
            affectedModules: disableResult.affectedModules,
            modules: currentModules,
          };
        }
        nextModules = disableResult.nextModules;
        disabled = disableResult.disabled;
        affectedModules = disableResult.affectedModules;
      } else if (body.action === 'set') {
        nextModules = normalizeModules(body.moduleIds);
      } else {
        throw new Error('Accion invalida.');
      }

      const validation = validateModuleSet(nextModules);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          activated,
          disabled,
          affectedModules,
          modules: currentModules,
        };
      }

      assertFeatureLimit(center, currentModules, nextModules);

      transaction.update(centerRef, {
        enabledModules: nextModules,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        activated,
        disabled,
        affectedModules,
        modules: nextModules,
        limit: getPlanLimits(center.planId)?.featureLimit ?? center.featureLimit ?? PLAN_LIMITS.basic.featureLimit,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BillingLimitError) {
      return NextResponse.json(
        { code: error.code, error: error.message, success: false },
        { status: errorStatusByCode[error.code] ?? 400 }
      );
    }

    console.error('Error actualizando modulos:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error interno.',
        success: false,
      },
      { status: 500 }
    );
  }
}
