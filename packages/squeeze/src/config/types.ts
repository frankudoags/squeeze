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
