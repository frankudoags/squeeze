import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  external: ['jiti'],
  output: {
    dir: 'dist',
    format: 'esm',
  },
});
