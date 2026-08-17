import { z } from 'zod'

const request = z.object({ fileName: z.string().min(1), pageCount: z.number().int().min(1), text: z.string().min(1) })
const result = z.object({ view: z.unknown(), diagnostics: z.record(z.string(), z.unknown()) })

export const TYPERT_REMOTE = {
  package: '@cmath/dsh-math-map',
  descriptors: [{
    id: '@cmath/dsh-math-map#mathMapImport/run', service: 'mathMapImportApi', namespace: 'mathMapImport', method: 'run',
    invocation: { kind: 'direct' },
    parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@cmath/dsh-math-map/paper-import#PaperImportRequest', schema: request } }],
    cancellation: { parameter: 'signal' },
    result: { mode: 'strict', typeSymbol: '@cmath/dsh-math-map/paper-import#PaperImportResult', schema: result },
  }],
} as const

export default TYPERT_REMOTE
