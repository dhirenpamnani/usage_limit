import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit, Reading } from '../types'

const PANE = 'usage-limits'
const TITLE = 'Usage limits'

const reading = atom(
  { plugin: 'usage-limits', key: 'reading' } as const,
  { limits: [], at: 0 } as Reading,
  { shape: 'reading-1' },
)

const LABELS: Record<string, string> = {
  five_hour: 'Current session (5h)',
  seven_day: 'Weekly (all models)',
  seven_day_opus: 'Weekly (Opus)',
  seven_day_sonnet: 'Weekly (Sonnet)',
  spend_limit: 'Spend limit',
}
const ORDER = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']

const label = (kind: string) => LABELS[kind] ?? kind.replace(/_/g, ' ')

const colorFor = (pct: number) =>
  pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success'

function sorted(limits: Limit[]): Limit[] {
  const rank = (k: string) => {
    const i = ORDER.indexOf(k)
    return i === -1 ? ORDER.length : i
  }
  return [...limits].sort((a, b) => rank(a.kind) - rank(b.kind))
}

async function save($: EngineInterface, limits: Limit[]) {
  if (limits.length === 0) return
  const at = await $.clock.now()
  await update($, reading, () => ({
    limits: limits.map(l => ({
      kind: l.kind,
      percentUsed: l.percentUsed,
      resetsAt: l.resetsAt,
    })),
    at,
  }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await $.command.register({
      name: 'limits',
      description: 'Open the usage limits pane',
    })
    void $.ui.open({ id: PANE, title: TITLE })

    try {
      const usage = await $.session.usage()
      await save($, usage.rateLimits)
    } catch {
      // No reading yet; the pane waits for the first response.
    }

    return started
  })

  on('command.run', { command: 'limits' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    return {
      text: opened.isPlaced
        ? 'Usage limits pane opened.'
        : `Usage limits pane could not be shown: ${opened.reason}`,
    }
  })

  // Re-open whenever a surface (the desktop window) attaches, so the pane
  // shows up by itself without typing /limits.
  on('session.attach', async ($, e, next) => {
    const attached = await next(e)
    void $.ui.open({ id: PANE, title: TITLE })
    return attached
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await save($, e.rateLimits)
    return next(e)
  })

  // An always-visible row just above the message box.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { limits } = await read($, reading)
    const { Box, Text } = $.ui.resolve(e)

    if (limits.length === 0) {
      return (
        <Box>
          <Text dimColor>Usage: waiting for Claude's next reply…</Text>
        </Box>
      )
    }

    const rows = sorted(limits).filter(
      l => l.kind === 'five_hour' || l.kind === 'seven_day',
    )
    const shown = rows.length > 0 ? rows : sorted(limits).slice(0, 2)

    return (
      <Box flexDirection="row" gap={2}>
        {shown.map(l => (
          <Text>
            <Text dimColor>
              {l.kind === 'five_hour' ? '5h session' : l.kind === 'seven_day' ? 'Weekly' : label(l.kind)}{' '}
            </Text>
            <Text bold color={colorFor(l.percentUsed)}>
              {Math.round(l.percentUsed)}%
            </Text>
          </Text>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { limits } = await read($, reading)
    const isWidget = e.props.placement === 'widget'
    const barWidth = Math.max(10, Math.min(40, (e.props.bodyColumns ?? 30) - 2))

    if (limits.length === 0) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>No usage reading yet.</Text>
          <Text dimColor>
            Limits appear after Claude's next reply in this session. API-key
            (non-subscription) sessions have no plan limits.
          </Text>
        </Box>
      )
    }

    const rows = sorted(limits)

    if (isWidget) {
      return (
        <Box flexDirection="column">
          {rows.slice(0, 2).map(l => (
            <Text color={colorFor(l.percentUsed)}>
              {l.kind === 'five_hour' ? '5h' : l.kind === 'seven_day' ? 'Week' : label(l.kind)}{' '}
              {Math.round(l.percentUsed)}%
            </Text>
          ))}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {rows.map(l => {
          const pct = Math.max(0, Math.min(100, l.percentUsed))
          const filled = Math.round((pct / 100) * barWidth)
          return (
            <Box flexDirection="column">
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold>{label(l.kind)}</Text>
                <Text color={colorFor(l.percentUsed)}>
                  {l.percentUsed.toFixed(l.percentUsed % 1 ? 1 : 0)}%
                </Text>
              </Box>
              <Box flexDirection="row" width={barWidth} height={1}>
                <Box width={filled} height={1} backgroundColor={colorFor(pct)} />
                <Box width={barWidth - filled} height={1} backgroundColor="subtle" />
              </Box>
            </Box>
          )
        })}
        <Text dimColor>
          Refreshes with each reply
        </Text>
      </Box>
    )
  })
}
