import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deep equality with stable key ordering. Produces canonical JSON for comparison.
export function deepEqual(a: unknown, b: unknown): boolean {
  const canonicalize = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
    const res: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      res[k] = canonicalize((obj as Record<string, unknown>)[k]);
    }
    return res;
  };

  try {
    const ca = canonicalize(a);
    const cb = canonicalize(b);
    return JSON.stringify(ca) === JSON.stringify(cb);
  } catch (e) {
    return false;
  }
}

export function computePasswordStrength(pw: string) {
  if (!pw) return 0;
  const checks = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  const score = checks.filter(Boolean).length;
  return (score / 5) * 100;
}
