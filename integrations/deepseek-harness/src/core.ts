import { Service, type Context } from '@deepseek-ai/cordis'

export interface RawProject { projectTitle: string; mainTargetEntryId: string; b0ClaimEntryIds?: string[]; entries: any[]; inferences: any[] }
declare module '@deepseek-ai/cordis' { interface Context { mathMapCore: MathMapCore } }

export class MathMapCore extends Service {
  constructor(ctx: Context) { super(ctx, 'mathMapCore') }
  validate(raw: RawProject): RawProject {
    if (!raw || !Array.isArray(raw.entries) || !Array.isArray(raw.inferences)) throw new Error('Math Map result must contain entries and inferences')
    const ids = new Set<string>()
    for (const [i, entry] of raw.entries.entries()) {
      if (!entry || typeof entry.id !== 'string' || !entry.id) throw new Error(`entries[${i}].id is required`)
      if (ids.has(entry.id)) throw new Error(`duplicate entry id: ${entry.id}`)
      ids.add(entry.id)
    }
    if (!ids.has(raw.mainTargetEntryId)) throw new Error('mainTargetEntryId does not reference an entry')
    for (const inference of raw.inferences) {
      if (!ids.has(inference.conclusion) || !Array.isArray(inference.premises) || inference.premises.some((id: string) => !ids.has(id)))
        throw new Error(`broken inference reference: ${inference.id ?? '<unnamed>'}`)
    }
    return structuredClone(raw)
  }
  projectView(raw: RawProject, fileName: string) {
    const value = this.validate(raw)
    return { schema: 'cmath.project-view-model/v0.1', semanticModel: 'cmath.fact-claim-operation/v0.1', project: { id: `paper:${slug(fileName)}`, title: value.projectTitle }, ...value }
  }
}
function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'import' }
export default function apply(ctx: Context): MathMapCore { return new MathMapCore(ctx) }
