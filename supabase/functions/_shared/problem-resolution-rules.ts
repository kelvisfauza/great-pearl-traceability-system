export const ESCALATION_EMAIL = 'fauzakusa@greatpearlcoffee.com';
export function classifyProblem(message: string) {
  if (/TypeError|ReferenceError|SyntaxError|ChunkLoadError|Cannot read properties|is not a function|failed to fetch dynamically imported module/i.test(message))
    return { kind: 'code', label: 'Suspected code problem', action: 'A developer must investigate; Settings cannot change application code.' };
  if (/timeout|connection|network|failed to fetch|upstream|disconnect/i.test(message))
    return { kind: 'connection', label: 'Connection problem', action: 'Check connection, then retry loading the affected page. Do not resend a payment.' };
  if (/permission|not authorized|unauthorized|forbidden|row.level|access denied/i.test(message))
    return { kind: 'access', label: 'Access problem', action: 'Review staff permissions with an administrator; do not bypass access controls.' };
  return { kind: 'review', label: 'Needs investigation', action: 'Review the affected records or escalate. The cause has not been confirmed.' };
}
export function isSafeRecovery(action: string) {
  return ['connection_check', 'record_check', 'reload_records'].includes(action);
}