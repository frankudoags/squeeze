import { describe, it, expect } from 'vitest';
import { parseArgs } from '../cli.js';

describe('parseArgs', () => {
  const base = ['node', 'squeeze'];

  it('parses scan command', () => {
    const result = parseArgs([...base, 'scan']);
    expect(result.command).toBe('scan');
  });

  it('parses check command', () => {
    const result = parseArgs([...base, 'check']);
    expect(result.command).toBe('check');
  });

  it('parses fix command', () => {
    const result = parseArgs([...base, 'fix']);
    expect(result.command).toBe('fix');
  });

  it('returns null command when none provided', () => {
    const result = parseArgs(base);
    expect(result.command).toBeNull();
  });

  it('parses --config flag', () => {
    const result = parseArgs([...base, 'scan', '--config', 'my.config.json']);
    expect(result.config).toBe('my.config.json');
  });

  it('parses --paths flag', () => {
    const result = parseArgs([...base, 'scan', '--paths', 'src/images,assets']);
    expect(result.paths).toEqual(['src/images', 'assets']);
  });

  it('parses --max-kb flag', () => {
    const result = parseArgs([...base, 'check', '--max-kb', '200']);
    expect(result.maxKb).toBe(200);
  });

  it('parses --formats flag', () => {
    const result = parseArgs([...base, 'check', '--formats', 'webp,avif']);
    expect(result.formats).toEqual(['webp', 'avif']);
  });

  it('parses --json flag', () => {
    const result = parseArgs([...base, 'check', '--json']);
    expect(result.json).toBe(true);
  });

  it('parses --dry-run flag', () => {
    const result = parseArgs([...base, 'fix', '--dry-run']);
    expect(result.dryRun).toBe(true);
  });

  it('parses --help / -h', () => {
    expect(parseArgs([...base, '--help']).help).toBe(true);
    expect(parseArgs([...base, '-h']).help).toBe(true);
  });

  it('parses --version / -V', () => {
    expect(parseArgs([...base, '--version']).version).toBe(true);
    expect(parseArgs([...base, '-V']).version).toBe(true);
  });

  it('parses multiple flags together', () => {
    const result = parseArgs([
      ...base,
      'check',
      '--config',
      'cfg.json',
      '--paths',
      'img',
      '--max-kb',
      '100',
      '--formats',
      'webp',
      '--json',
      '--dry-run',
    ]);
    expect(result.command).toBe('check');
    expect(result.config).toBe('cfg.json');
    expect(result.paths).toEqual(['img']);
    expect(result.maxKb).toBe(100);
    expect(result.formats).toEqual(['webp']);
    expect(result.json).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it('defaults flags to false/null/empty', () => {
    const result = parseArgs([...base, 'scan']);
    expect(result.config).toBeNull();
    expect(result.paths).toEqual([]);
    expect(result.maxKb).toBeNull();
    expect(result.formats).toEqual([]);
    expect(result.json).toBe(false);
    expect(result.dryRun).toBe(false);
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });
});
