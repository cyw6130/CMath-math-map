import { Service, type Context } from '@deepseek-ai/cordis'
import type { ReasoningEffortId } from '@deepseek-ai/dsh-llm'

/** Canonical Math Map workflow stages. `integrate` is retained as a v1/v2 alias. */
export type ImportStage = 'guide' | 'extract' | 'aggregate' | 'assemble' | 'repair' | 'integrate'
export interface StageRoute { provider: string; model: string; reasoningEffort?: ReasoningEffortId; maxTokens: number }
export type RouterConfig = Partial<Record<ImportStage, StageRoute>>

declare module '@deepseek-ai/cordis' { interface Context { mathMapImportRouter: MathMapImportRouter } }

export class MathMapImportRouter extends Service {
  constructor(ctx: Context, private readonly routes: RouterConfig) { super(ctx, 'mathMapImportRouter') }
  select(stage: ImportStage): Readonly<StageRoute> {
    // Old profiles route `integrate`; v3 calls that stage `aggregate`. Guide
    // is intentionally allowed to share extract's deployment route.
    const route = this.routes[stage]
      ?? (stage === 'aggregate' ? this.routes.integrate : undefined)
      ?? (stage === 'integrate' ? this.routes.aggregate : undefined)
      ?? (stage === 'guide' ? this.routes.extract : undefined)
    if (!route?.provider || !route.model || !Number.isInteger(route.maxTokens) || route.maxTokens < 1)
      throw new Error(`math-map router: invalid route for ${stage}`)
    return Object.freeze({ ...route })
  }
}

export const inject = ['llm']
export default function apply(ctx: Context, config: RouterConfig): MathMapImportRouter {
  const router = new MathMapImportRouter(ctx, config)
  const available = new Set(ctx.llm.listProviders().map((item: { id: string }) => item.id))
  for (const stage of ['guide', 'extract', 'aggregate', 'assemble', 'repair'] as const) {
    const route = router.select(stage)
    if (!available.has(route.provider)) ctx.logger.warn(`math-map router: provider ${route.provider} for ${stage} is not registered yet`)
  }
  return router
}
