import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { ResolvedConfig } from '../config/index.js';

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.bmp', '.ico', '.tiff', '.tif',
]);

export function isIgnored(filePath: string, ignoreGlobs: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of ignoreGlobs) {
    const p = pattern.replace(/\\/g, '/');
    if (p.startsWith('**/') && p.endsWith('/**')) {
      const segment = p.slice(3, -3);
      if (normalized.includes(`/${segment}/`)) return true;
    } else if (p.startsWith('**/')) {
      const suffix = p.slice(3);
      if (normalized.endsWith(suffix) || normalized.includes(suffix)) return true;
    } else if (p.endsWith('/**')) {
      const prefix = p.slice(0, -3);
      if (normalized.startsWith(prefix + '/') || normalized === prefix) return true;
    } else if (normalized.includes(p)) {
      return true;
    }
  }
  return false;
}

export function scanDir(dir: string, ignoreGlobs: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isIgnored(fullPath, ignoreGlobs)) {
        results.push(...scanDir(fullPath, ignoreGlobs));
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext) && !isIgnored(fullPath, ignoreGlobs)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export function scanImages(config: ResolvedConfig): string[] {
  const roots = config.includePaths.map((p) => resolve(p));
  const all: string[] = [];
  for (const root of roots) {
    all.push(...scanDir(root, config.ignoreGlobs));
  }
  return [...new Set(all)].sort();
}

export function inspectFile(filePath: string): { format: string; sizeBytes: number } {
  const stat = statSync(filePath);
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return { format: ext === 'jpg' ? 'jpeg' : ext, sizeBytes: stat.size };
}
