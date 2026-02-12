import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type CenterTask = {
  id: string;
  status: TaskStatus;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  priority?: TaskPriority;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
};

export type UpdateTaskPatch = {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: TaskPriority;
  status?: TaskStatus;
};

const tasksCollection = (centerId: string) =>
  collection(db, "centers", centerId, "tasks");

const taskDoc = (centerId: string, taskId: string) =>
  doc(db, "centers", centerId, "tasks", taskId);

const trimOrUndefined = (value?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  return next || undefined;
};

const validateTitle = (title: string): string => {
  const next = title.trim();
  if (next.length < 2) {
    throw new Error("El titulo debe tener al menos 2 caracteres.");
  }
  return next;
};

const normalizePriority = (priority?: TaskPriority): TaskPriority => {
  if (priority === "LOW" || priority === "MEDIUM" || priority === "HIGH") {
    return priority;
  }
  return "MEDIUM";
};

const sortTasks = (rows: CenterTask[]): CenterTask[] => {
  return rows.slice().sort((a, b) => {
    const aDue = a.dueDate?.toMillis();
    const bDue = b.dueDate?.toMillis();

    if (typeof aDue === "number" && typeof bDue === "number" && aDue !== bDue) {
      return aDue - bDue;
    }
    if (typeof aDue === "number") return -1;
    if (typeof bDue === "number") return 1;

    const aUpdated = a.updatedAt?.toMillis() ?? 0;
    const bUpdated = b.updatedAt?.toMillis() ?? 0;
    return bUpdated - aUpdated;
  });
};

export const listTasks = (
  centerId: string,
  onChange: (tasks: CenterTask[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  return onSnapshot(
    tasksCollection(centerId),
    (snap) => {
      const rows = snap.docs.map((taskRef) => ({
        id: taskRef.id,
        ...(taskRef.data() as Omit<CenterTask, "id">),
      }));
      onChange(sortTasks(rows));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const createTask = async (
  centerId: string,
  payload: CreateTaskPayload
): Promise<void> => {
  const title = validateTitle(payload.title);
  const description = trimOrUndefined(payload.description);
  const priority = normalizePriority(payload.priority);
  const status = payload.status ?? "TODO";

  await addDoc(tasksCollection(centerId), {
    status,
    title,
    description: description ?? null,
    dueDate: payload.dueDate ? Timestamp.fromDate(payload.dueDate) : null,
    priority,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateTask = async (
  centerId: string,
  taskId: string,
  patch: UpdateTaskPatch
): Promise<void> => {
  const nextPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof patch.title === "string") {
    nextPatch.title = validateTitle(patch.title);
  }

  if (typeof patch.description === "string") {
    nextPatch.description = trimOrUndefined(patch.description) ?? null;
  }

  if (patch.dueDate instanceof Date) {
    nextPatch.dueDate = Timestamp.fromDate(patch.dueDate);
  } else if (patch.dueDate === null) {
    nextPatch.dueDate = null;
  }

  if (patch.priority) {
    nextPatch.priority = normalizePriority(patch.priority);
  }

  if (patch.status) {
    nextPatch.status = patch.status;
  }

  await updateDoc(taskDoc(centerId, taskId), nextPatch);
};

export const updateTaskStatus = async (
  centerId: string,
  taskId: string,
  status: TaskStatus
): Promise<void> => {
  await updateDoc(taskDoc(centerId, taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTask = async (centerId: string, taskId: string): Promise<void> => {
  await deleteDoc(taskDoc(centerId, taskId));
};
