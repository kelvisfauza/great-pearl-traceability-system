export function approvalActionAllowed(method: string, action: unknown, tokenAction: unknown): boolean {
  return method === 'POST' && (action === 'approve' || action === 'reject') && action === tokenAction;
}