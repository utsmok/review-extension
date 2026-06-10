// Mock session-repository for Remotion — prevents IDB access in headless render
import type { SessionRepository } from "@/lib/session-repository";

const noopRepo: SessionRepository = {
	save: async () => true,
	load: async () => null,
	delete: async () => {},
	isAvailable: async () => false,
};

let current: SessionRepository = noopRepo;
export function getRepository(): SessionRepository { return current; }
export function setRepository(repo: SessionRepository): void { current = repo; }
export function resetRepository(): void { current = noopRepo; }
export const SCHEMA_VERSION = 1;
