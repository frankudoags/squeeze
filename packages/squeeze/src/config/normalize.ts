import { DEFAULTS } from './types.js';
import { validateConfig } from './validate.js';
import type { RawConfig, ResolvedConfig } from './types.js';

function nonEmptyArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.length > 0 && val.every((v) => typeof v === 'string');
}

function positiveInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

export function normalizeConfig(raw: RawConfig = {}): ResolvedConfig {
  const errors = validateConfig(raw);
  if (errors.length > 0) {
    throw new Error(`Invalid config:\n  ${errors.join('\n  ')}`);
  }

  const rf = raw.resizeFallback ?? {};
  const rfDefaults = DEFAULTS.resizeFallback;

  return {
    includePaths: nonEmptyArray(raw.includePaths) ? raw.includePaths : [...DEFAULTS.includePaths],
    ignoreGlobs: nonEmptyArray(raw.ignoreGlobs) ? raw.ignoreGlobs : [...DEFAULTS.ignoreGlobs],
    maxSizeKb: positiveInt(raw.maxSizeKb) ? raw.maxSizeKb : DEFAULTS.maxSizeKb,
    allowedFormats: nonEmptyArray(raw.allowedFormats) ? raw.allowedFormats : [...DEFAULTS.allowedFormats],
    outputStrategy: raw.outputStrategy ?? DEFAULTS.outputStrategy,
    qualityFloor: raw.qualityFloor ?? DEFAULTS.qualityFloor,
    maxCompressionIterations: raw.maxCompressionIterations ?? DEFAULTS.maxCompressionIterations,
    resizeFallback: {
      enabled: rf.enabled ?? rfDefaults.enabled,
      minWidth: rf.minWidth ?? rfDefaults.minWidth,
      minHeight: rf.minHeight ?? rfDefaults.minHeight,
      stepPercent: rf.stepPercent ?? rfDefaults.stepPercent,
    },
  };
}
