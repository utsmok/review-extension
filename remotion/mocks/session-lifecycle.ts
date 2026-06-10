/** No-op session lifecycle mock for Remotion rendering. */
export async function loadSessionById(): Promise<boolean> {
  return true;
}
export async function saveCurrentSession(): Promise<void> {}
export async function createSession(): Promise<void> {}
export async function deleteSession(): Promise<void> {}
export async function switchToSession(): Promise<void> {}
export async function markDoneAndClose(): Promise<void> {}
export async function exportSessionById(): Promise<Blob> {
  return new Blob([], { type: "application/zip" });
}
export async function importSessionFromZipFile(): Promise<string> {
  return "mock-imported-id";
}
export function initAutoSave(): void {}
export function teardownAutoSave(): void {}
