export function mayReply(caller: { userId: string; employeeId: string; isAdministrator: boolean }, assignedTo: string | null) {
  return caller.isAdministrator || assignedTo === caller.userId || assignedTo === caller.employeeId;
}