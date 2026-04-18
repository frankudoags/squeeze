import { relative } from 'node:path';
import type { ResolvedConfig } from '../../config/index.js';
import { scanImages, inspectFile } from '../scanner.js';
import type { Report, FileResult } from '../types.js';

export function cmdCheck(config: ResolvedConfig, asJson: boolean): Report {
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
