import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function generateConfigContent(format: 'json' | 'js' | 'ts'): string {
  if (format === 'json') {
    return (
      JSON.stringify(
        {
          includePaths: ['.'],
          ignoreGlobs: ['**/node_modules/**', '**/.git/**'],
          maxSizeKb: 500,
          allowedFormats: ['webp'],
          outputStrategy: 'side-by-side',
          qualityFloor: 60,
          maxCompressionIterations: 8,
          resizeFallback: {
            enabled: false,
            minWidth: 320,
            minHeight: 320,
            stepPercent: 10,
          },
        },
        null,
        2,
      ) + '\n'
    );
  }

  if (format === 'js') {
    return `export default {
  includePaths: ['.'],
  ignoreGlobs: ['**/node_modules/**', '**/.git/**'],
  maxSizeKb: 500,
  allowedFormats: ['webp'],
  outputStrategy: 'side-by-side',
  qualityFloor: 60,
  maxCompressionIterations: 8,
  resizeFallback: {
    enabled: false,
    minWidth: 320,
    minHeight: 320,
    stepPercent: 10,
  },
};
`;
  }

  // TypeScript
  return `import type { RawConfig } from '@squeeze/squeeze';

const config: RawConfig = {
  includePaths: ['.'],
  ignoreGlobs: ['**/node_modules/**', '**/.git/**'],
  maxSizeKb: 500,
  allowedFormats: ['webp'],
  outputStrategy: 'side-by-side',
  qualityFloor: 60,
  maxCompressionIterations: 8,
  resizeFallback: {
    enabled: false,
    minWidth: 320,
    minHeight: 320,
    stepPercent: 10,
  },
};

export default config;
`;
}

const CONFIG_FILENAMES: Record<string, string> = {
  json: 'squeeze.config.json',
  js: 'squeeze.config.js',
  ts: 'squeeze.config.ts',
};

export async function cmdInit(): Promise<void> {
  console.log('Squeeze config setup\n');
  console.log('Choose a config file format:');
  console.log('  1. JSON (squeeze.config.json)');
  console.log('  2. JavaScript (squeeze.config.js)');
  console.log('  3. TypeScript (squeeze.config.ts)');

  const answer = await prompt('\nEnter 1, 2, or 3: ');
  const map: Record<string, 'json' | 'js' | 'ts'> = { '1': 'json', '2': 'js', '3': 'ts' };
  const format = map[answer];
  if (!format) {
    console.error(`Invalid choice: "${answer}". Please enter 1, 2, or 3.`);
    process.exit(2);
  }

  const filename = CONFIG_FILENAMES[format];
  const fullPath = join(process.cwd(), filename);

  if (existsSync(fullPath)) {
    console.error(`Error: ${filename} already exists. Remove it first if you want to regenerate.`);
    process.exit(2);
  }

  writeFileSync(fullPath, generateConfigContent(format));
  console.log(`Created ${filename}`);
}
