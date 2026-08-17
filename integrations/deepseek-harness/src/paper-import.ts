import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage, type GenerateOptions, type TokenUsage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
// The existing browser workflow is intentionally JavaScript; this seam is covered by its Node tests.
// @ts-expect-error no declaration is shipped by the static Math Map application
import paperImportClient from '../../../paper-import-client.js'
import type { ImportStage } from './router.js'

export interface PaperImportConfig { chunkCharacters: number; overlapCharacters: number; concurrency: number; experimentId?: string; condition?: string; workflowVersion?: 'v1' | 'v2'; tokenBudget?: { integrate: number; normal: number; retry: number } }
interface ChatRequest { messages: Array<{ role: string; content: string }>; maxTokens: number; stage: string; signal?: AbortSignal }
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
  if (value.includes('assembl') || value === 'response') return 'assemble'
  if (value.includes('integrat')) return 'integrate'
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
    metrics.push({ stage, reasoningEffort: route.reasoningEffort ?? null, requestedMaxTokens: request.maxTokens, effectiveMaxTokens: options.maxTokens!, durationMs: Math.round(performance.now() - startedAt), finishReason: 'length', usage: jsonUsage(assembler.usage) })
    return { content, finishReason: 'length' }
  }
  if (finish.kind !== 'stop') {
    const failure = 'failure' in finish ? finish.failure : undefined
    const detail = failure
      ? `: ${failure.code ?? 'UNKNOWN'} — ${failure.message ?? 'no provider message'}`
      : ''
    throw new Error(`Math Map ${stage} call ended with ${finish.kind}${detail}`)
  }
  metrics.push({ stage, reasoningEffort: route.reasoningEffort ?? null, requestedMaxTokens: request.maxTokens, effectiveMaxTokens: options.maxTokens!, durationMs: Math.round(performance.now() - startedAt), finishReason: finish.kind, usage: jsonUsage(assembler.usage) })
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
