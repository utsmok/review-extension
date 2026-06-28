import { RUBRIC_DATA } from "@/data/rubrics";
import type { RubricData } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Recursively mutable view of a deeply-readonly type (for in-memory patching of a clone). */
type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] };

/**
 * Deep-clone the shipped rubric, then apply the active customization:
 * value patches → question additions → question removals → child reordering.
 * Eager: reads the customization store on every call.
 */
export function getActiveRubric(): RubricData {
  const root = structuredClone(RUBRIC_DATA) as unknown as Mutable<RubricData>;
  const { rubric } = useFrameworkCustomizationStore.getState().customization;

  for (const [path, value] of Object.entries(rubric.valuePatches)) applyPatch(root, path, value);
  for (const add of rubric.addedQuestions)
    insertQuestion(root, add.section, add.parent, add.key, add.def);
  for (const rem of rubric.removedQuestions) deleteQuestion(root, rem.section, rem.parent, rem.key);
  for (const [parent, keys] of Object.entries(rubric.order)) reorderChildren(root, parent, keys);

  return root as unknown as RubricData;
}

type Obj = Record<string, unknown>;

/** Navigate a dot-joined path (e.g. "scoring_rubric.TR.data_source_clarity.title") and set the leaf. */
function applyPatch(root: Obj, path: string, value: unknown): void {
  const parts = path.split(".");
  let node: Obj = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (!next || typeof next !== "object") return;
    node = next as Obj;
  }
  node[parts[parts.length - 1]] = value;
}

function sectionObj(root: Obj, section: string): Obj {
  return (root[section] ?? {}) as Obj;
}

function insertQuestion(root: Obj, section: string, parent: string, key: string, def: Obj): void {
  const sec = sectionObj(root, section);
  if (!sec[parent] || typeof sec[parent] !== "object") sec[parent] = {};
  const parentObj = sec[parent] as Obj;
  parentObj[key] = def;
}

function deleteQuestion(root: Obj, section: string, parent: string, key: string): void {
  const parentObj = sectionObj(root, section)[parent] as Obj | undefined;
  if (parentObj) delete parentObj[key];
}

/** Rebuild a parent's children in the given key order, preserving unordered children at the tail. */
function reorderChildren(root: Obj, parent: string, keys: string[]): void {
  const parts = parent.split(".");
  let node: unknown = root;
  for (const p of parts) {
    if (!node || typeof node !== "object") return;
    node = (node as Obj)[p];
  }
  if (!node || typeof node !== "object") return;
  const target = node as Obj;
  const src = { ...target };
  const ordered: Obj = {};
  for (const k of keys) if (k in src) ordered[k] = src[k];
  for (const k of Object.keys(src)) if (!(k in ordered)) ordered[k] = src[k];
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, ordered);
}
