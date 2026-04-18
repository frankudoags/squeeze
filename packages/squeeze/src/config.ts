import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Types ──────────────────────────────────────────────────────────────────

export type OutputStrategy = 'side-by-side' | 'in-place';

export type ResizeFallbackConfig = {
  enabled: boolean;
  minWidth: number;
  minHeight: number;
  stepPercent: number;
};

export type RawConfig = {
  includePaths?: string[];
  ignoreGlobs?: string[];
  maxSizeKb?: number;
  allowedFormats?: string[];
  outputStrategy?: OutputStrategy;
  qualityFloor?: number;
  maxCompressionIterations?: number;
  resizeFallback?: {
    enabled?: boolean;
    minWidth?: number;
    minHeight?: number;
    stepPercent?: number;
  };
};

export type ResolvedConfig = {
  includePaths: string[];
  ignoreGlobs: string[];
  maxSizeKb: number;
  allowedFormats: string[];
  outputStrategy: OutputStrategy;
  qualityFloor: number;
  maxCompressionIterations: number;
  resizeFallback: ResizeFallbackConfig;
};

// ── Defaults (single source of truth, matches config.v1.json) ──────────────

export const DEFAULTS = {
  includePaths: ['.'],
  ignoreGlobs: ['**/node_modules/**', '**/.git/**'],
  maxSizeKb: 500,
  allowedFormats: ['webp'],
  outputStrategy: 'side-by-side' as OutputStrategy,
  qualityFloor: 60,
  maxCompressionIterations: 8,
  resizeFallback: {
    enabled: false,
    minWidth: 320,
    minHeight: 320,
    stepPercent: 10,
  },
} satisfies ResolvedConfig;

const ALLOWED_FORMATS = new Set(['webp', 'jpeg', 'png', 'avif']);
const OUTPUT_STRATEGIES = new Set<OutputStrategy>(['side-by-side', 'in-place']);

// ── Internal helpers ───────────────────────────────────────────────────────

function nonEmptyArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.length > 0 && val.every((v) => typeof v === 'string');
}

function positiveInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
}

function intInRange(val: unknown, min: number, max: number): val is number {
  return positiveInt(val) && val >= min && val <= max;
}

// ── Validate ───────────────────────────────────────────────────────────────

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

// ── Normalize ──────────────────────────────────────────────────────────────

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

// ── File discovery ─────────────────────────────────────────────────────────

export function loadConfigFile(filePath: string): RawConfig {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Config file ${filePath} must contain a JSON object`);
  }
  return raw as RawConfig;
}

export function discoverConfig(cwd: string): RawConfig {
  const cfgPath = join(cwd, 'squeeze.config.json');
  if (existsSync(cfgPath)) {
    return loadConfigFile(cfgPath);
  }

  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.squeeze && typeof pkg.squeeze === 'object') {
      return pkg.squeeze as RawConfig;
    }
  }

  return {};
}
