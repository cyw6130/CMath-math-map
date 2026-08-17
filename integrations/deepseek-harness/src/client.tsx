import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MathMapWorkspace } from './workspace.js'

function MathMapImportRow({ block }: ToolCallViewProps) {
  const running = !('kind' in block)
  let summary = running ? '处理中…' : block.isError ? '导入失败' : '已完成'
  if (!running && !block.isError) {
    const text = block.content.filter(item => item.type === 'text').map(item => item.text).join(' ')
    const title = /"projectTitle":"([^"]+)/u.exec(text)?.[1]
    if (title) summary = title
  }
  return <div style={{ border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: '8px 12px' }}>
    <strong>Math Map 论文导入</strong><span style={{ marginLeft: 8, opacity: .7 }}>{summary}</span>
  </div>
}
export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'math-map', order: 20, label: () => 'Math Map',
  }, MathMapWorkspace))
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: 'cmath_import_paper' }, MathMapImportRow))
}
