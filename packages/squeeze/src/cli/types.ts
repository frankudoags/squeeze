export type FileResult = {
  path: string;
  inputFormat: string;
  inputSizeBytes: number;
  status: 'compliant' | 'violation' | 'fixed' | 'unresolved' | 'error';
  reasonCode: string;
  outputFormat?: string;
  outputSizeBytes?: number;
};

export type Report = {
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
