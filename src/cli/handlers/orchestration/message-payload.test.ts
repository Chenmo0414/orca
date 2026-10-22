import { describe, expect, it } from 'vitest'
import { getOptionalStructuredMessagePayload } from './message-payload'

describe('structured message payload composition', () => {
  it('preserves extra JSON values and lets explicit flags replace every matching field', () => {
    const flags = new Map([
      [
        'payload',
        JSON.stringify({
          taskId: 'old_task',
          dispatchId: 'old_dispatch',
          outcome: 'failed',
          filesModified: ['old.ts'],
          reportPath: 'old.md',
          phase: 'old',
          model_signature: 'example-model',
          metadata: { attempts: 2, verified: true },
          references: ['report'],
          optional: null
        })
      ],
      ['task-id', 'task_1'],
      ['dispatch-id', 'ctx_1'],
      ['outcome', 'succeeded'],
      ['files-modified', ' src/a.ts, ,src/b.ts, '],
      ['report-path', 'reports/done.md'],
      ['phase', 'verification']
    ])

    expect(JSON.parse(getOptionalStructuredMessagePayload(flags)!)).toEqual({
      taskId: 'task_1',
      dispatchId: 'ctx_1',
      outcome: 'succeeded',
      filesModified: ['src/a.ts', 'src/b.ts'],
      reportPath: 'reports/done.md',
      phase: 'verification',
      model_signature: 'example-model',
      metadata: { attempts: 2, verified: true },
      references: ['report'],
      optional: null
    })
  })

  it('keeps raw lifecycle fields that have no structured override', () => {
    const payload = getOptionalStructuredMessagePayload(
      new Map([
        ['payload', '{"taskId":"task_1","dispatchId":"ctx_1","outcome":"failed"}'],
        ['phase', 'verification']
      ])
    )
    expect(JSON.parse(payload!)).toEqual({
      taskId: 'task_1',
      dispatchId: 'ctx_1',
      outcome: 'failed',
      phase: 'verification'
    })
  })

  it.each(['null', '[]', '[{"extra":true}]', '"text"', '42', 'false', '{"extra":'])(
    'rejects a non-object or malformed combined payload: %s',
    (raw) => {
      expect(() =>
        getOptionalStructuredMessagePayload(
          new Map([
            ['payload', raw],
            ['task-id', 'task_1']
          ])
        )
      ).toThrow('--payload must be a JSON object when combined with structured payload flags.')
    }
  )

  it.each(['{ "extra": true }', 'null', '[]', '42', 'plain text', '{"extra":'])(
    'leaves a raw-only payload unchanged: %s',
    (raw) => {
      expect(getOptionalStructuredMessagePayload(new Map([['payload', raw]]))).toBe(raw)
    }
  )

  it('still rejects invalid outcomes and valueless structured flags', () => {
    expect(() =>
      getOptionalStructuredMessagePayload(
        new Map([
          ['payload', '{"outcome":"succeeded"}'],
          ['outcome', 'pending']
        ])
      )
    ).toThrow('Invalid --outcome. Expected succeeded or failed.')
    expect(() =>
      getOptionalStructuredMessagePayload(
        new Map<string, string | boolean>([
          ['payload', '{}'],
          ['task-id', true]
        ])
      )
    ).toThrow('--task-id requires a value')
  })

  it('preserves the PowerShell quote-stripping diagnostic', () => {
    expect(() =>
      getOptionalStructuredMessagePayload(
        new Map([
          ['payload', '{model_signature:example}'],
          ['task-id', 'task_1']
        ])
      )
    ).toThrow('its quotes are missing')
  })

  it('treats prototype-shaped JSON keys as data without changing object prototypes', () => {
    const payload = getOptionalStructuredMessagePayload(
      new Map([
        ['payload', '{"__proto__":{"phase":"injected"},"constructor":{"extra":true}}'],
        ['task-id', 'task_1']
      ])
    )
    expect(JSON.parse(payload!)).toEqual(
      JSON.parse(
        '{"__proto__":{"phase":"injected"},"constructor":{"extra":true},"taskId":"task_1"}'
      )
    )
    expect(Object.prototype).not.toHaveProperty('phase')
  })
})
