// Only send sign-in links back to the app's own addresses.
const ALLOWED = [
  /^https:\/\/(www\.)?greatpearlcoffeesystem\.site$/i,
  /^https:\/\/great-pearl-traceability-system\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]*0ab47c69-3f36-4407-b03c-de1f9684ac9a[a-z0-9-]*\.lovable(project)?\.(app|com)$/i,
  /^https?:\/\/localhost(:\d+)?$/i,
  /^capacitor:\/\/localhost$/i,
];
export const DEFAULT_ORIGIN = "https://greatpearlcoffeesystem.site";
export function safeOrigin(req: Request): string {
  const o = req.headers.get("origin")?.trim() || "";
  return ALLOWED.some((r) => r.test(o)) ? o : DEFAULT_ORIGIN;
}
