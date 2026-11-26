export function walletLockInput(body: Record<string, unknown>) {
  if (body.action !== "apply" && body.action !== "release") throw new Error("Invalid action");
  if (body.reason !== undefined) throw new Error("Custom attendance-lock reasons are not allowed");
  const percentage = body.percentage ?? 35;
  if (typeof percentage !== "number" || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }
  return {
    action: body.action,
    percentage,
    reason: `${percentage}% of your wallet has been temporarily locked until all attendance records are fully entered into the system. Once attendance is complete, the lock will be released.`,
  };
}