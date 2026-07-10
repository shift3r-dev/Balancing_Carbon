export const str = (a: unknown, b?: unknown) =>
  (typeof a === 'string' ? a : typeof b === 'string' ? b : '').trim();

export const num = (a: unknown, b?: unknown) => {
  const raw = a ?? b ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export const optionalFinite = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Numeric values must be finite.');
  return n;
};

export const requiredFinite = (value: unknown, label: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} must be finite.`);
  return n;
};
