type RawConfig = {
  includePaths?: string[];
  ignoreGlobs?: string[];
  maxSizeKb?: number;
  allowedFormats?: string[];
  outputStrategy?: "in-place" | "side-by-side";
  qualityFloor?: number;
  maxCompressionIterations?: number;
  resizeFallback?: {
    enabled?: boolean;
    minWidth?: number;
    minHeight?: number;
    stepPercent?: number;
  };
};

export function normalizeConfig(raw: RawConfig = {}) {
  const includePaths = Array.isArray(raw.includePaths) && raw.includePaths.length > 0 ? raw.includePaths : ["."];
  const maxSizeKb =
    typeof raw.maxSizeKb === "number" && Number.isInteger(raw.maxSizeKb) && raw.maxSizeKb > 0 ? raw.maxSizeKb : 500;
  const allowedFormats = Array.isArray(raw.allowedFormats) && raw.allowedFormats.length > 0 ? raw.allowedFormats : ["webp"];
  const resizeFallback = raw.resizeFallback ?? {};

  return {
    includePaths,
    ignoreGlobs: Array.isArray(raw.ignoreGlobs) ? raw.ignoreGlobs : ["**/node_modules/**", "**/.git/**"],
    maxSizeKb,
    allowedFormats,
    outputStrategy: raw.outputStrategy === "in-place" ? "in-place" : "side-by-side",
    qualityFloor: Number.isInteger(raw.qualityFloor) ? raw.qualityFloor : 60,
    maxCompressionIterations: Number.isInteger(raw.maxCompressionIterations) ? raw.maxCompressionIterations : 8,
    resizeFallback: {
      enabled: Boolean(resizeFallback.enabled),
      minWidth: Number.isInteger(resizeFallback.minWidth) ? resizeFallback.minWidth : 320,
      minHeight: Number.isInteger(resizeFallback.minHeight) ? resizeFallback.minHeight : 320,
      stepPercent: Number.isInteger(resizeFallback.stepPercent) ? resizeFallback.stepPercent : 10
    }
  };
}