/**
 * Pure reorder logic for drag-and-drop sortable lists.
 * No side effects, no mutation — always returns a new array.
 */

/**
 * Moves the element identified by `sourceId` to the position of `targetId`.
 *
 * - If `sourceId === targetId`, or either id is not present in `ids`,
 *   returns a shallow copy of `ids` unchanged.
 * - Otherwise, removes `sourceId` from its current position and splices it
 *   in at `targetId`'s original index (standard array-move semantics).
 */
export function computeReorder<T>(ids: T[], sourceId: T, targetId: T): T[] {
  if (sourceId === targetId) return [...ids];

  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex === -1 || targetIndex === -1) return [...ids];

  const next = [...ids];
  const [removed] = next.splice(sourceIndex, 1);
  // Use the original targetIndex: splice handles out-of-bounds by clamping.
  next.splice(targetIndex, 0, removed);
  return next;
}
