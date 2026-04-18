import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULTS,
  normalizeConfig,
  validateConfig,
  discoverConfig,
  loadConfigFile,
  type RawConfig,
} from '../config.js';

describe('DEFAULTS', () => {
  it('matches the expected shape from config.v1.json', () => {
    expect(DEFAULTS.includePaths).toEqual(['.']);
    expect(DEFAULTS.ignoreGlobs).toEqual(['**/node_modules/**', '**/.git/**']);
    expect(DEFAULTS.maxSizeKb).toBe(500);
    expect(DEFAULTS.allowedFormats).toEqual(['webp']);
    expect(DEFAULTS.outputStrategy).toBe('side-by-side');
    expect(DEFAULTS.qualityFloor).toBe(60);
    expect(DEFAULTS.maxCompressionIterations).toBe(8);
    expect(DEFAULTS.resizeFallback).toEqual({
      enabled: false,
      minWidth: 320,
      minHeight: 320,
      stepPercent: 10,
    });
  });
});

describe('normalizeConfig', () => {
  it('returns all defaults for empty input', () => {
    const config = normalizeConfig();
    expect(config).toEqual(DEFAULTS);
  });

  it('returns all defaults for empty object', () => {
    const config = normalizeConfig({});
    expect(config).toEqual(DEFAULTS);
  });

  it('applies explicit overrides', () => {
    const raw: RawConfig = {
      includePaths: ['src/images'],
      ignoreGlobs: ['**/dist/**'],
      maxSizeKb: 200,
      allowedFormats: ['webp', 'avif'],
      outputStrategy: 'in-place',
      qualityFloor: 80,
      maxCompressionIterations: 12,
      resizeFallback: {
        enabled: true,
        minWidth: 640,
        minHeight: 480,
        stepPercent: 5,
      },
    };
    const config = normalizeConfig(raw);
    expect(config.includePaths).toEqual(['src/images']);
    expect(config.ignoreGlobs).toEqual(['**/dist/**']);
    expect(config.maxSizeKb).toBe(200);
    expect(config.allowedFormats).toEqual(['webp', 'avif']);
    expect(config.outputStrategy).toBe('in-place');
    expect(config.qualityFloor).toBe(80);
    expect(config.maxCompressionIterations).toBe(12);
    expect(config.resizeFallback).toEqual({
      enabled: true,
      minWidth: 640,
      minHeight: 480,
      stepPercent: 5,
    });
  });

  it('applies partial overrides with defaults for the rest', () => {
    const config = normalizeConfig({ maxSizeKb: 100 });
    expect(config.maxSizeKb).toBe(100);
    expect(config.includePaths).toEqual(DEFAULTS.includePaths);
    expect(config.qualityFloor).toBe(DEFAULTS.qualityFloor);
  });

  it('throws on invalid config', () => {
    expect(() => normalizeConfig({ qualityFloor: 0 })).toThrow('Invalid config');
    expect(() => normalizeConfig({ qualityFloor: 101 })).toThrow('Invalid config');
    expect(() => normalizeConfig({ maxCompressionIterations: 21 })).toThrow('Invalid config');
    expect(() => normalizeConfig({ allowedFormats: ['bmp'] })).toThrow('Invalid config');
  });

  it('applies partial resizeFallback with defaults', () => {
    const config = normalizeConfig({ resizeFallback: { enabled: true } });
    expect(config.resizeFallback.enabled).toBe(true);
    expect(config.resizeFallback.minWidth).toBe(DEFAULTS.resizeFallback.minWidth);
    expect(config.resizeFallback.minHeight).toBe(DEFAULTS.resizeFallback.minHeight);
    expect(config.resizeFallback.stepPercent).toBe(DEFAULTS.resizeFallback.stepPercent);
  });
});

describe('validateConfig', () => {
  it('returns empty array for valid empty config', () => {
    expect(validateConfig({})).toEqual([]);
  });

  it('returns errors for qualityFloor out of bounds', () => {
    expect(validateConfig({ qualityFloor: 0 })).toHaveLength(1);
    expect(validateConfig({ qualityFloor: 101 })).toHaveLength(1);
    expect(validateConfig({ qualityFloor: 50 })).toEqual([]);
  });

  it('returns errors for maxCompressionIterations out of bounds', () => {
    expect(validateConfig({ maxCompressionIterations: 0 })).toHaveLength(1);
    expect(validateConfig({ maxCompressionIterations: 21 })).toHaveLength(1);
    expect(validateConfig({ maxCompressionIterations: 10 })).toEqual([]);
  });

  it('returns errors for invalid allowedFormats', () => {
    const errors = validateConfig({ allowedFormats: ['bmp', 'tiff'] });
    expect(errors.length).toBe(2);
  });

  it('returns error for invalid outputStrategy', () => {
    const errors = validateConfig({ outputStrategy: 'invalid' as any });
    expect(errors.length).toBe(1);
  });

  it('returns error for invalid maxSizeKb', () => {
    expect(validateConfig({ maxSizeKb: -1 })).toHaveLength(1);
    expect(validateConfig({ maxSizeKb: 0 })).toHaveLength(1);
  });

  it('returns errors for resizeFallback fields', () => {
    expect(validateConfig({ resizeFallback: { stepPercent: 51 } })).toHaveLength(1);
    expect(validateConfig({ resizeFallback: { stepPercent: 0 } })).toHaveLength(1);
    expect(validateConfig({ resizeFallback: { minWidth: 0 } })).toHaveLength(1);
  });

  it('returns multiple errors at once', () => {
    const errors = validateConfig({ qualityFloor: 0, maxCompressionIterations: 99 });
    expect(errors.length).toBe(2);
  });
});

const TMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '__test_tmp__');

describe('discoverConfig', () => {
  beforeEach(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('loads squeeze.config.json', () => {
    const cfgPath = join(TMP_DIR, 'squeeze.config.json');
    writeFileSync(cfgPath, JSON.stringify({ maxSizeKb: 100, allowedFormats: ['png'] }));
    const raw = discoverConfig(TMP_DIR);
    expect(raw.maxSizeKb).toBe(100);
    expect(raw.allowedFormats).toEqual(['png']);
  });

  it('loads package.json#squeeze', () => {
    const pkgPath = join(TMP_DIR, 'package.json');
    writeFileSync(pkgPath, JSON.stringify({ name: 'test', squeeze: { maxSizeKb: 250 } }));
    const raw = discoverConfig(TMP_DIR);
    expect(raw.maxSizeKb).toBe(250);
  });

  it('prefers squeeze.config.json over package.json#squeeze', () => {
    writeFileSync(join(TMP_DIR, 'squeeze.config.json'), JSON.stringify({ maxSizeKb: 100 }));
    writeFileSync(join(TMP_DIR, 'package.json'), JSON.stringify({ squeeze: { maxSizeKb: 999 } }));
    const raw = discoverConfig(TMP_DIR);
    expect(raw.maxSizeKb).toBe(100);
  });

  it('returns empty object when no config file exists', () => {
    const raw = discoverConfig(TMP_DIR);
    expect(raw).toEqual({});
  });

  it('ignores package.json without squeeze field', () => {
    writeFileSync(join(TMP_DIR, 'package.json'), JSON.stringify({ name: 'test' }));
    const raw = discoverConfig(TMP_DIR);
    expect(raw).toEqual({});
  });
});

describe('loadConfigFile', () => {
  it('reads and parses a JSON config file', () => {
    const cfgPath = join(TMP_DIR, 'test.config.json');
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(cfgPath, JSON.stringify({ maxSizeKb: 42 }));
    const raw = loadConfigFile(cfgPath);
    expect(raw.maxSizeKb).toBe(42);
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('throws on invalid JSON', () => {
    const cfgPath = join(TMP_DIR, 'bad.config.json');
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(cfgPath, 'not json');
    expect(() => loadConfigFile(cfgPath)).toThrow();
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('throws on non-object JSON', () => {
    const cfgPath = join(TMP_DIR, 'array.config.json');
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(cfgPath, '[1,2,3]');
    expect(() => loadConfigFile(cfgPath)).toThrow('must contain a JSON object');
    rmSync(TMP_DIR, { recursive: true, force: true });
  });
});
