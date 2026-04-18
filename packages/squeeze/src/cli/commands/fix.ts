import type { Report } from '../types.js';

export function cmdFix(asJson: boolean): Report {
  const message = 'The fix command requires the native engine (not yet available).';
  const report: Report = {
    version: '1',
    command: 'fix',
    summary: { total: 0, compliant: 0, violations: 0, fixed: 0, unresolved: 0 },
    files: [],
    exitCode: 0,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(message);
  }

  return report;
}
