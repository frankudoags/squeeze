import { relative } from 'node:path';
import type { ResolvedConfig } from '../../config/index.js';
import { scanImages, inspectFile } from '../scanner.js';
import type { Report, FileResult } from '../types.js';

export function cmdScan(config: ResolvedConfig, asJson: boolean): Report {
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
