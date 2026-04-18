export type Command = 'scan' | 'check' | 'fix' | 'init';

export type ParsedArgs = {
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
