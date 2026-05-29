import type { RubricData } from "@/lib/types";
import trustFull from "./trust-full.json";

/** Recursively freeze an object and all nested values. */
function deepFreeze<T>(obj: T): T {
	if (obj && typeof obj === "object") {
		Object.freeze(obj);
		for (const val of Object.values(obj as object)) {
			deepFreeze(val);
		}
	}
	return obj;
}

export const RUBRIC_DATA: RubricData = deepFreeze(trustFull) as unknown as RubricData;
