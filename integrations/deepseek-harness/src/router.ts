import { Service, type Context } from '@deepseek-ai/cordis'
import type { ReasoningEffortId } from '@deepseek-ai/dsh-llm'

export type ImportStage = 'extract' | 'integrate' | 'assemble' | 'repair'
export interface StageRoute { provider: string; model: string; reasoningEffort?: ReasoningEffortId; maxTokens: number }
export type RouterConfig = Record<ImportStage, StageRoute>

declare module '@deepseek-ai/cordis' { interface Context { mathMapImportRouter: MathMapImportRouter } }

export class MathMapImportRouter extends Service {
  constructor(ctx: Context, private readonly routes: RouterConfig) { super(ctx, 'mathMapImportRouter') }
  select(stage: ImportStage): Readonly<StageRoute> {
    const route = this.routes[stage]
    if (!route?.provider || !route.model || !Number.isInteger(route.maxTokens) || route.maxTokens < 1)
      throw new Error(`math-map router: invalid route for ${stage}`)
    return Object.freeze({ ...route })
  }
}

export const inject = ['llm']
export default function apply(ctx: Context, config: RouterConfig): MathMapImportRouter {
  const router = new MathMapImportRouter(ctx, config)
  const available = new Set(ctx.llm.listProviders().map((item: { id: string }) => item.id))
  for (const stage of ['extract', 'integrate', 'assemble', 'repair'] as const) {
    const route = router.select(stage)
    if (!available.has(route.provider)) ctx.logger.warn(`math-map router: provider ${route.provider} for ${stage} is not registered yet`)
  }
  return router
}
