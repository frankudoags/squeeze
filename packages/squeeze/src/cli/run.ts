import { resolve } from 'node:path';
import { normalizeConfig, discoverConfig, loadConfigFile, type RawConfig, type ResolvedConfig } from '../config/index.js';
import { parseArgs } from './parse-args.js';
import { cmdScan } from './commands/scan.js';
import { cmdCheck } from './commands/check.js';
import { cmdFix } from './commands/fix.js';
import { cmdInit } from './commands/init.js';
import type { Report } from './types.js';

const HELP = `Usage: squeeze <command> [options]

Commands:
  init    Create a config file interactively
  scan    Find images and list them with size/format
  check   Scan and flag violations (oversized, wrong format)
  fix     Optimize images (requires native engine)

Options:
  --config <path>      Path to config file
  --paths <glob,...>   Paths to scan (comma-separated)
  --max-kb <n>         Max allowed size in KB
  --formats <list>     Allowed formats (comma-separated)
  --json               Output as JSON
  --dry-run            Show what would be done
  -h, --help           Show this help
  -V, --version        Show version
`;

export async function run(argv: string[] = process.argv): Promise<void> {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (parsed.version) {
    try {
      const { readFileSync } = await import('node:fs');
      const { dirname, join } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const here = dirname(fileURLToPath(import.meta.url));
      const pkgPath = join(here, '..', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      console.log(`squeeze v${pkg.version}`);
    } catch {
      console.log('squeeze v0.0.0');
    }
    process.exit(0);
  }

  if (!parsed.command) {
    console.error('Error: No command specified. Use --help for usage.');
    process.exit(2);
  }

  if (parsed.command === 'init') {
    await cmdInit();
    return;
  }

  if (parsed.command !== 'scan' && parsed.command !== 'check' && parsed.command !== 'fix') {
    console.error(`Error: Unknown command "${parsed.command}". Use --help for usage.`);
    process.exit(2);
  }

  // Load config
  let raw: RawConfig = {};
  try {
    if (parsed.config) {
      raw = await loadConfigFile(resolve(parsed.config));
    } else {
      raw = await discoverConfig(process.cwd());
    }
  } catch (err) {
    console.error(`Error loading config: ${(err as Error).message}`);
    process.exit(2);
  }

  // Apply CLI overrides
  if (parsed.paths.length > 0) raw.includePaths = parsed.paths;
  if (parsed.maxKb !== null) raw.maxSizeKb = parsed.maxKb;
  if (parsed.formats.length > 0) raw.allowedFormats = parsed.formats;

  // Normalize
  let config: ResolvedConfig = normalizeConfig({});
  try {
    config = normalizeConfig(raw);
  } catch (err) {
    console.error(`Config error: ${(err as Error).message}`);
    process.exit(2);
  }

  // Execute command
  let report: Report = {
    version: '1',
    command: parsed.command ?? 'scan',
    summary: { total: 0, compliant: 0, violations: 0, fixed: 0, unresolved: 0 },
    files: [],
    exitCode: 0,
  };

  switch (parsed.command) {
    case 'scan':
      report = cmdScan(config, parsed.json);
      break;
    case 'check':
      report = cmdCheck(config, parsed.json);
      break;
    case 'fix':
      report = cmdFix(parsed.json);
      break;
  }

  if (report.exitCode !== 0) {
    process.exit(report.exitCode);
  }
}
