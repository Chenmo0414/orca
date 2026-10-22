import { expect, it } from 'vitest'
import { messagePayload, parseLegacyRelayCliArgs } from './legacy-relay-cli-args'

it('merges extra payload fields for a worker completing through a legacy SSH relay', () => {
  const { flags } = parseLegacyRelayCliArgs([
    'orchestration',
    'send',
    '--type',
    'worker_done',
    '--payload',
    '{"model_signature":"example-model","taskId":"old","outcome":"failed"}',
    '--task-id',
    'task_1',
    '--dispatch-id',
    'ctx_1',
    '--outcome',
    'succeeded',
    '--files-modified',
    ' src/a.ts, ,src/b.ts ',
    '--report-path',
    'done.md',
    '--phase',
    'verified'
  ])
  expect(JSON.parse(messagePayload(flags)!)).toEqual({
    model_signature: 'example-model',
    taskId: 'task_1',
    dispatchId: 'ctx_1',
    outcome: 'succeeded',
    filesModified: ['src/a.ts', 'src/b.ts'],
    reportPath: 'done.md',
    phase: 'verified'
  })
})

it('rejects invalid combined payloads and outcomes in the legacy relay', () => {
  expect(() =>
    messagePayload(
      new Map([
        ['payload', '[]'],
        ['task-id', 'task_1']
      ])
    )
  ).toThrow('--payload must be a JSON object')
  expect(() =>
    messagePayload(
      new Map([
        ['payload', '{}'],
        ['outcome', 'pending']
      ])
    )
  ).toThrow('Invalid --outcome')
})
