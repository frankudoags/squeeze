import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { normalizeConfig, discoverConfig, loadConfigFile, type RawConfig, type ResolvedConfig } from './config.js';

// ── Types ──────────────────────────────────────────────────────────────────

type Command = 'scan' | 'check' | 'fix';

type ParsedArgs = {
  command: Command | null;
  config: string | null;
  paths: string[];
  maxKb: number | null;
  formats: string[];
  json: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
};

type FileResult = {
  path: string;
  inputFormat: string;
  inputSizeBytes: number;
  status: 'compliant' | 'violation' | 'fixed' | 'unresolved' | 'error';
  reasonCode: string;
  outputFormat?: string;
  outputSizeBytes?: number;
};

type Report = {
  version: '1';
  command: string;
  summary: {
    total: number;
    compliant: number;
    violations: number;
    fixed: number;
    unresolved: number;
  };
  files: FileResult[];
  exitCode: 0 | 1 | 2;
};

// ── Constants ──────────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.bmp', '.ico', '.tiff', '.tif']);

const HELP = `Usage: squeeze <command> [options]

Commands:
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

// ── Parse args ─────────────────────────────────────────────────────────────

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: null,
    config: null,
    paths: [],
    maxKb: null,
    formats: [],
    json: false,
    dryRun: false,
    help: false,
    version: false,
  };

  const args = argv.slice(2); // skip node + script

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-V' || arg === '--version') {
      result.version = true;
    } else if (arg === '--config') {
      result.config = args[++i] ?? null;
    } else if (arg === '--paths') {
      const val = args[++i];
      if (val) result.paths = val.split(',').map((s) => s.trim());
    } else if (arg === '--max-kb') {
      const val = args[++i];
      if (val) result.maxKb = parseInt(val, 10);
    } else if (arg === '--formats') {
      const val = args[++i];
      if (val) result.formats = val.split(',').map((s) => s.trim());
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (!arg.startsWith('-') && result.command === null) {
      result.command = arg as Command;
    }
  }

  return result;
}

// ── Scanner ────────────────────────────────────────────────────────────────

function isIgnored(filePath: string, ignoreGlobs: string[]): boolean {
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

function scanDir(dir: string, ignoreGlobs: string[]): string[] {
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

function scanImages(config: ResolvedConfig): string[] {
  const roots = config.includePaths.map((p) => resolve(p));
  const all: string[] = [];
  for (const root of roots) {
    all.push(...scanDir(root, config.ignoreGlobs));
  }
  return [...new Set(all)].sort();
}

// ── File inspection ────────────────────────────────────────────────────────

function inspectFile(filePath: string): { format: string; sizeBytes: number } {
  const stat = statSync(filePath);
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return { format: ext === 'jpg' ? 'jpeg' : ext, sizeBytes: stat.size };
}

// ── Commands ───────────────────────────────────────────────────────────────

function cmdScan(config: ResolvedConfig, asJson: boolean): Report {
  const files = scanImages(config);

  const fileResults: FileResult[] = files.map((fp) => {
    const info = inspectFile(fp);
    return {
      path: fp,
      inputFormat: info.format,
      inputSizeBytes: info.sizeBytes,
      status: 'compliant' as const,
      reasonCode: 'NONE',
    };
  });

  const report: Report = {
    version: '1',
    command: 'scan',
    summary: {
      total: fileResults.length,
      compliant: fileResults.length,
      violations: 0,
      fixed: 0,
      unresolved: 0,
    },
    files: fileResults,
    exitCode: 0,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (fileResults.length === 0) {
      console.log('No images found.');
    } else {
      for (const f of fileResults) {
        const sizeKb = (f.inputSizeBytes / 1024).toFixed(1);
        console.log(`  ${relative(process.cwd(), f.path)}  ${sizeKb} KB  ${f.inputFormat}`);
      }
      console.log(`\n${fileResults.length} image(s) found.`);
    }
  }

  return report;
}

function cmdCheck(config: ResolvedConfig, asJson: boolean): Report {
  const files = scanImages(config);
  const maxBytes = config.maxSizeKb * 1024;
  const allowedFormatsLower = new Set(config.allowedFormats.map((f) => f.toLowerCase()));

  const fileResults: FileResult[] = files.map((fp) => {
    const info = inspectFile(fp);
    const reasons: string[] = [];
    let isViolation = false;

    if (info.sizeBytes > maxBytes) {
      isViolation = true;
      reasons.push('MAX_SIZE_EXCEEDED');
    }
    if (!allowedFormatsLower.has(info.format.toLowerCase())) {
      isViolation = true;
      reasons.push('UNSUPPORTED_FORMAT');
    }

    return {
      path: fp,
      inputFormat: info.format,
      inputSizeBytes: info.sizeBytes,
      status: isViolation ? ('violation' as const) : ('compliant' as const),
      reasonCode: reasons.length > 0 ? (reasons[0] as FileResult['reasonCode']) : 'NONE',
    };
  });

  const violations = fileResults.filter((f) => f.status === 'violation').length;
  const compliant = fileResults.length - violations;

  const report: Report = {
    version: '1',
    command: 'check',
    summary: {
      total: fileResults.length,
      compliant,
      violations,
      fixed: 0,
      unresolved: 0,
    },
    files: fileResults,
    exitCode: violations > 0 ? 1 : 0,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (fileResults.length === 0) {
      console.log('No images found.');
    } else {
      for (const f of fileResults) {
        const rel = relative(process.cwd(), f.path);
        const sizeKb = (f.inputSizeBytes / 1024).toFixed(1);
        if (f.status === 'violation') {
          console.log(`  ✗ ${rel}  ${sizeKb} KB  ${f.inputFormat}  (${f.reasonCode})`);
        } else {
          console.log(`  ✓ ${rel}  ${sizeKb} KB  ${f.inputFormat}`);
        }
      }
      console.log(`\nTotal: ${fileResults.length} | Compliant: ${compliant} | Violations: ${violations}`);
    }
  }

  return report;
}

function cmdFix(asJson: boolean): Report {
  const message = 'The fix command requires the native engine (not yet available).';
  const report: Report = {
    version: '1',
    command: 'fix',
    summary: { total: 0, compliant: 0, violations: 0, fixed: 0, unresolved: 0 },
    files: [],
    exitCode: 0,
  };

  if (asJson) {
    report.files = [];
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(message);
  }

  return report;
}

// ── Main entry ─────────────────────────────────────────────────────────────

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

  if (parsed.command !== 'scan' && parsed.command !== 'check' && parsed.command !== 'fix') {
    console.error(`Error: Unknown command "${parsed.command}". Use --help for usage.`);
    process.exit(2);
  }

  // Load config
  let raw: RawConfig = {};
  try {
    if (parsed.config) {
      raw = loadConfigFile(resolve(parsed.config));
    } else {
      raw = discoverConfig(process.cwd());
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
