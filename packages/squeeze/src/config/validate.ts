import type { RawConfig, OutputStrategy } from './types.js';

const ALLOWED_FORMATS = new Set(['webp', 'jpeg', 'png', 'avif']);
const OUTPUT_STRATEGIES = new Set<OutputStrategy>(['side-by-side', 'in-place']);

function nonEmptyArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.length > 0 && val.every((v) => typeof v === 'string');
}

function positiveInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

function intInRange(val: unknown, min: number, max: number): val is number {
  return positiveInt(val) && val >= min && val <= max;
}

export function validateConfig(raw: RawConfig): string[] {
  const errors: string[] = [];

  if (raw.includePaths !== undefined) {
    if (!nonEmptyArray(raw.includePaths)) {
      errors.push('includePaths must be a non-empty array of strings');
    } else {
      for (const p of raw.includePaths) {
        if (p.length === 0) errors.push('includePaths items must be non-empty strings');
      }
    }
  }

  if (raw.ignoreGlobs !== undefined) {
    if (!nonEmptyArray(raw.ignoreGlobs)) {
      errors.push('ignoreGlobs must be a non-empty array of strings');
    } else {
      for (const g of raw.ignoreGlobs) {
        if (g.length === 0) errors.push('ignoreGlobs items must be non-empty strings');
      }
    }
  }

  if (raw.maxSizeKb !== undefined && !intInRange(raw.maxSizeKb, 1, Infinity)) {
    errors.push('maxSizeKb must be a positive integer');
  }

  if (raw.allowedFormats !== undefined) {
    if (!nonEmptyArray(raw.allowedFormats)) {
      errors.push('allowedFormats must be a non-empty array');
    } else {
      for (const f of raw.allowedFormats) {
        if (!ALLOWED_FORMATS.has(f)) {
          errors.push(`allowedFormats: "${f}" is not valid (expected webp, jpeg, png, or avif)`);
        }
      }
    }
  }

  if (raw.outputStrategy !== undefined && !OUTPUT_STRATEGIES.has(raw.outputStrategy)) {
    errors.push(`outputStrategy: "${raw.outputStrategy}" is not valid (expected side-by-side or in-place)`);
  }

  if (raw.qualityFloor !== undefined && !intInRange(raw.qualityFloor, 1, 100)) {
    errors.push('qualityFloor must be an integer between 1 and 100');
  }

  if (raw.maxCompressionIterations !== undefined && !intInRange(raw.maxCompressionIterations, 1, 20)) {
    errors.push('maxCompressionIterations must be an integer between 1 and 20');
  }

  if (raw.resizeFallback !== undefined) {
    const rf = raw.resizeFallback;
    if (rf.minWidth !== undefined && !intInRange(rf.minWidth, 1, Infinity)) {
      errors.push('resizeFallback.minWidth must be a positive integer');
    }
    if (rf.minHeight !== undefined && !intInRange(rf.minHeight, 1, Infinity)) {
      errors.push('resizeFallback.minHeight must be a positive integer');
    }
    if (rf.stepPercent !== undefined && !intInRange(rf.stepPercent, 1, 50)) {
      errors.push('resizeFallback.stepPercent must be an integer between 1 and 50');
    }
  }

  return errors;
}
