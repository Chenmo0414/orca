export function mergeOrchestrationMessagePayload(
  rawPayload: string | undefined,
  structuredPayload: Record<string, string | string[]>
): { payload: string } | { error: string } {
  if (rawPayload === undefined) {
    return { payload: JSON.stringify(structuredPayload) }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawPayload)
  } catch {
    return { error: '--payload must be a JSON object when combined with structured payload flags.' }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: '--payload must be a JSON object when combined with structured payload flags.' }
  }
  // Explicit flags win over raw fields, including lifecycle identity and outcome.
  return { payload: JSON.stringify({ ...parsed, ...structuredPayload }) }
}
