import { Timestamp } from "firebase/firestore";

export type TimestampLike = Timestamp | Date | null | undefined;

export const toTimestampOrNull = (value: TimestampLike): Timestamp | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  return Timestamp.fromDate(value);
};

export const toTimestampOrUndefined = (
  value: TimestampLike
): Timestamp | undefined => {
  const next = toTimestampOrNull(value);
  return next ?? undefined;
};

export const timestampToMillis = (value: TimestampLike): number | null => {
  const next = toTimestampOrNull(value);
  return next ? next.toMillis() : null;
};

export const daysFromNow = (days: number): Timestamp => {
  const target = new Date();
  target.setDate(target.getDate() + days);
  return Timestamp.fromDate(target);
};
