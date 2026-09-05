import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage, type GenerateOptions, type TokenUsage, type ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
// The existing browser workflow is intentionally JavaScript; this seam is covered by its Node tests.
// @ts-expect-error no declaration is shipped by the static Math Map application
import paperImportClient from '../../../src/paper-import/paper-import-client.js'
// Synchronized canonical capability asset; DSH only injects it into the
// workflow and does not own its prompts or schemas.
// @ts-expect-error no declaration is shipped by the synchronized browser asset
import paperImportV3Capability from '../../../src/paper-import/paper-import-v3-capability.js'
// @ts-expect-error synchronized browser assets do not ship declarations
import guideLeadContract from '../../../src/paper-import/guide-lead-contract-v1.js'
// @ts-expect-error synchronized browser assets do not ship declarations
import leadGuidedExtraction from '../../../src/paper-import/lead-guided-extraction-v1.js'
// @ts-expect-error synchronized browser assets do not ship declarations
import dualLaneAggregation from '../../../src/paper-import/dual-lane-extraction-aggregation-v1.js'
import type { ImportStage } from './router.js'

export interface PaperImportConfig { chunkCharacters: number; overlapCharacters: number; concurrency: number; experimentId?: string; condition?: string; workflowVersion?: 'v1' | 'v2' | 'v3' | 'v3.1' | 'v3.2' | 'v3.3' | 'v3.4' | 'v3.5' | 'v3.6' | 'v3.7' | 'v3.8' | 'v3.9' | 'v3.9.1' | 'v3.9.2' | 'v3.9.3' | 'v3.9.4' | 'v3.9.5' | 'v3.9.6' | 'v3.9.7' | 'v3.9.8' | 'v3.9.9' | 'v3.10' | 'v3.10.1' | 'v3.11' | 'v3.12' | 'v3.13' | 'v3.14' | 'v3.15' | 'v3.16' | 'v3.17' | 'v3.18' | 'v3.19' | 'v3.20' | 'v3.21' | 'v3.22' | 'v3.23' | 'v3.24' | 'v3.25' | 'v3.26' | 'v3.26-inference-v2' | 'v3.26-inference-v3' | 'v3.26-inference-v4-assembly' | 'v3.26-inference-v5-repair-coverage' | 'v3.26-inference-v6-repair-chain' | 'v3.26-inference-v7-repair-queue' | 'v3.27' | 'v3.28' | 'v3.29' | 'v3.30' | 'v3.31' | 'v3.32' | 'v3.33' | 'v3.34' | 'v3.35' | 'v3.36' | 'v3.37' | 'v3.38' | 'v3.39' | 'v3.40' | 'v3.41'; tokenBudget?: { integrate?: number; aggregate?: number; normal: number; retry: number } }
interface ChatRequest { messages: Array<{ role: string; content: string }>; maxTokens: number; stage: string; signal?: AbortSignal; reasoningEffort?: ReasoningEffortId }
export interface PaperImportRequest { fileName: string; pageCount: number; text: string }
export type PaperImportResult = { view: JsonValue; diagnostics: Record<string, JsonValue> }

declare module '@deepseek-ai/cordis' {
  interface Context { mathMapImportApi: MathMapImportApi }
}
type JsonUsage = Record<string, string | number | boolean | null>
type CallMetric = Record<string, string | number | boolean | null | JsonUsage>
export const inject = ['mathMapCore', 'mathMapImportRouter', 'llm', 'tools']

function stageOf(value: string): ImportStage {
  if (value.includes('repair') || value.includes('validate')) return 'repair'
  if (value.includes('assembl') || value.includes('compile-candidate') || value === 'response') return 'assemble'
  if (value.includes('aggregat') || value.includes('integrat')) return 'aggregate'
  if (value.includes('guide') && !value.includes('coverage') && !value.includes('lead-guided')) return 'guide'
  if (value.includes('coverage') || value.includes('lead-guided')) return 'extract'
  return 'extract'
}

function jsonUsage(usage: TokenUsage | undefined): JsonUsage | null {
  return usage ? {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? null,
    cacheWriteTokens: usage.cacheWriteTokens ?? null,
    reasoningTokens: usage.reasoningTokens ?? null,
  } : null
}

async function generate(ctx: Context, request: ChatRequest, metrics: CallMetric[]): Promise<{ content: string; finishReason: string }> {
  const stage = stageOf(request.stage)
  const route = ctx.mathMapImportRouter.select(stage)
  const effectiveReasoningEffort = request.reasoningEffort !== undefined ? request.reasoningEffort : route.reasoningEffort
  const startedAt = performance.now()
  const system = request.messages.filter(message => message.role === 'system').map(message => message.content).join('\n')
  const messages = request.messages.filter(message => message.role !== 'system').map(message => createUserMessage({
    content: [{ type: 'text', text: message.content }], source: { kind: 'plugin', plugin: 'cmath-paper-import' },
  }))
  // The browser workflow already chooses a stage-specific budget (8k for
  // integration, 16k normally, and 32k for a truncation retry). The router's
  // maxTokens is only a deployment safety cap; it must not replace that
  // established workflow behavior.
  const options: GenerateOptions = {
    ...route,
    ...(effectiveReasoningEffort !== undefined ? { reasoningEffort: effectiveReasoningEffort } : {}),
    maxTokens: Math.min(request.maxTokens, route.maxTokens),
    messages,
    system,
    signal: request.signal,
  }
  const assembler = new BlockAssembler()
  for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
  const finish = assembler.finish
  const content = assembler.blocks().filter((block): block is Extract<ReturnType<BlockAssembler['blocks']>[number], { type: 'text' }> => block.type === 'text').map(block => block.text).join('')
  // The shared browser workflow speaks the OpenAI-compatible finish reason
  // `length` and uses it to retry truncated 16k calls with a 32k budget. DSH
  // normalizes that same condition to `max-tokens`, so translate it at this
  // provider boundary while preserving the partial text for repair context.
  if (finish.kind === 'max-tokens') {
    metrics.push({ stage, reasoningEffort: options.reasoningEffort ?? route.reasoningEffort ?? null, requestedMaxTokens: request.maxTokens, effectiveMaxTokens: options.maxTokens!, durationMs: Math.round(performance.now() - startedAt), finishReason: 'length', usage: jsonUsage(assembler.usage) })
    return { content, finishReason: 'length' }
  }
  if (finish.kind !== 'stop') {
    const failure = 'failure' in finish ? finish.failure : undefined
    const detail = failure
      ? `: ${failure.code ?? 'UNKNOWN'} — ${failure.message ?? 'no provider message'}`
      : ''
    throw new Error(`Math Map ${stage} call ended with ${finish.kind}${detail}`)
  }
  metrics.push({ stage, reasoningEffort: options.reasoningEffort ?? route.reasoningEffort ?? null, requestedMaxTokens: request.maxTokens, effectiveMaxTokens: options.maxTokens!, durationMs: Math.round(performance.now() - startedAt), finishReason: finish.kind, usage: jsonUsage(assembler.usage) })
  return { content, finishReason: finish.kind }
}

export async function runPaperImport(ctx: Context, config: PaperImportConfig, args: PaperImportRequest, signal?: AbortSignal, onStage?: (stage: string) => void): Promise<PaperImportResult> {
  const stages: string[] = []
  const calls: CallMetric[] = []
  const startedAt = performance.now()
  const view = await paperImportClient.requestPaperProjectView({
    fileName: args.fileName, pageCount: args.pageCount, text: args.text,
    maxChunks: config.concurrency, tokenBudget: config.tokenBudget, signal,
    workflowVersion: config.workflowVersion ?? 'v1',
    workflowCapabilities: { paper: paperImportV3Capability, guideLead: guideLeadContract, leadGuided: leadGuidedExtraction, aggregate: dualLaneAggregation },
    onStage: (stage: string) => {
      if (stages.at(-1) !== stage) stages.push(stage)
      onStage?.(stage)
    },
    chatImpl: (request: ChatRequest) => generate(ctx, request, calls),
  })
  return { view: view as JsonValue, diagnostics: { stages, router: 'mathMapImportRouter', experimentId: config.experimentId ?? null, condition: config.condition ?? null, durationMs: Math.round(performance.now() - startedAt), calls } as Record<string, JsonValue> }
}

export class MathMapImportApi extends TypertRemoteService {
  constructor(ctx: Context, private readonly config: PaperImportConfig) { super(ctx, 'mathMapImportApi', { namespace: 'mathMapImport' }) }

  run(request: PaperImportRequest, signal?: AbortSignal): Promise<PaperImportResult> {
    return runPaperImport(this.ctx, this.config, request, signal)
  }
}

export default function apply(ctx: Context, config: PaperImportConfig): void {
  ctx.plugin(MathMapImportApi, config)
  ctx.tools.register(defineTool({
    name: 'cmath_import_paper',
    description: 'Convert already extracted mathematical paper text into a validated Math Map Project View.',
    timeoutMs: 15 * 60 * 1000,
    parameters: {
      fileName: { type: 'string', required: true, description: 'Original PDF file name.' },
      pageCount: { type: 'integer', required: true, description: 'Number of pages in the paper.' },
      text: { type: 'string', required: true, description: 'Extracted text containing [[PAGE N]] markers.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: `Imported Math Map: ${JSON.stringify(value)}` }],
    },
    async execute(args, exec) {
      return runPaperImport(ctx, config, args, exec.signal)
    },
  }))
}
