import { defineConfig } from 'tsdown'

// DeepSeek Harness loads client modules through its module table.  The client
// artifact is therefore a CJS factory wrapped in __ModuleLoader__.load; it is
// not a browser ESM bundle.  Keep the node half and client half as separate
// builds so the client entry cannot accidentally inherit the ESM format.
const nodeConfig = {
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    router: 'src/router.ts',
    'paper-import': 'src/paper-import.ts',
    ui: 'src/ui.ts',
    typert: 'src/typert.host.ts',
    remote: 'src/typert.remote-client.ts',
  },
  outDir: 'lib',
  format: 'esm' as const,
  dts: true,
  clean: true,
  external: [/^@deepseek-ai\//, /^react/],
}

const clientConfig = {
  name: '@cmath/dsh-math-map/client',
  entry: { client: 'src/client.tsx' },
  outDir: 'lib',
  format: 'cjs' as const,
  platform: 'browser' as const,
  dts: false,
  clean: false,
  external: [
    'react',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-runtime/client',
    '@deepseek-ai/dsh-client-ui-tool',
    '@deepseek-ai/dsh-client-ui-tool/client',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-typert-protocol',
  ],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: "window.__ModuleLoader__.load({ id: '@cmath/dsh-math-map', factory: (require) => {",
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([nodeConfig, clientConfig])
