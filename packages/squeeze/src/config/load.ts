import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RawConfig } from './types.js';

const CONFIG_EXTENSIONS = ['.json', '.js', '.mjs', '.ts'] as const;

function validateConfigObject(raw: unknown, filePath: string): RawConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Config file ${filePath} must export an object`);
  }
  return raw as RawConfig;
}

async function loadJsConfig(filePath: string): Promise<RawConfig> {
  const jiti = await import('jiti');
  const load = jiti.createJiti(import.meta.url);
  const mod = await load.import(filePath);
  const raw = (mod as any)?.default ?? mod;
  return validateConfigObject(raw, filePath);
}

export async function loadConfigFile(filePath: string): Promise<RawConfig> {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  if (ext === '.json') {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    return validateConfigObject(raw, filePath);
  }
  return loadJsConfig(filePath);
}

export async function discoverConfig(cwd: string): Promise<RawConfig> {
  for (const ext of CONFIG_EXTENSIONS) {
    const cfgPath = join(cwd, `squeeze.config${ext}`);
    if (existsSync(cfgPath)) {
      return loadConfigFile(cfgPath);
    }
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
