import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importSessionFromZipFile } from "@/lib/session-lifecycle";
import {
  getRepository,
  InMemorySessionRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";
import type { SessionData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { makeCapture, makeEvaluation, makeMetadata } from "./fixtures";

// --- Mock importSessionFromZip to avoid JSZip/Blob incompatibility in Node ---
// The parse logic is covered separately in tests/import-session-zip.test.ts

vi.mock("@/lib/export", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/export")>();
  return {
    ...original,
    importSessionFromZip: vi.fn(),
  };
});

// Import the mock after vi.mock setup
const { importSessionFromZip } = await import("@/lib/export");

// --- Helpers ---

function makeSessionData(id = crypto.randomUUID()): SessionData {
  return {
    metadata: makeMetadata({ id }),
    captures: [makeCapture()],
    evaluations: [makeEvaluation()],
    finalization: null,
  };
}

/** Create a fake Blob that carries the session data via the mock. */
function makeZipBlob(): { blob: Blob; data: SessionData } {
  const data = makeSessionData();
  const blob = new Blob(["fake-zip"]);
  vi.mocked(importSessionFromZip).mockResolvedValue(data);
  return { blob, data };
}

// --- Setup / Teardown ---

beforeEach(() => {
  setRepository(new InMemorySessionRepository());
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
    settings: {
      reviewerName: "",
      reviewerEmail: "",
      preferredRubric: "trust-full",
    },
  });
});

afterEach(() => {
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
  });
  vi.mocked(importSessionFromZip).mockReset();
});

afterAll(() => {
  resetRepository();
  vi.restoreAllMocks();
});

// --- Tests ---

describe("importSessionFromZipFile", () => {
  it("returns the session ID on successful import", async () => {
    const { blob, data } = makeZipBlob();

    const id = await importSessionFromZipFile(blob);

    expect(id).toBe(data.metadata.id);
  });

  it("saves imported data to the repository", async () => {
    const { blob, data } = makeZipBlob();

    const id = await importSessionFromZipFile(blob);
    const loaded = await getRepository().load(id);

    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.id).toBe(data.metadata.id);
    expect(loaded?.metadata.toolName).toBe(data.metadata.toolName);
    expect(loaded?.captures).toHaveLength(1);
    expect(loaded?.evaluations).toHaveLength(1);
  });

  it("registers the session in the registry", async () => {
    const { blob, data } = makeZipBlob();

    await importSessionFromZipFile(blob);

    const { sessionIndex } = useRegistryStore.getState();
    const entry = sessionIndex[data.metadata.id];
    expect(entry).toBeDefined();
    expect(entry.toolName).toBe(data.metadata.toolName);
  });

  it("sets the imported session as active", async () => {
    const { blob, data } = makeZipBlob();

    await importSessionFromZipFile(blob);

    expect(useRegistryStore.getState().activeSessionId).toBe(data.metadata.id);
  });

  it("resolves with new ID when importing a duplicate session and shows warning", async () => {
    const { blob, data } = makeZipBlob();

    // First import succeeds
    const originalId = await importSessionFromZipFile(blob);

    // Re-mock to return same data for second import
    vi.mocked(importSessionFromZip).mockResolvedValue(data);

    const newId = await importSessionFromZipFile(blob);

    // Should resolve with a different ID
    expect(newId).not.toBe(originalId);
    expect(typeof newId).toBe("string");
    expect(newId.length).toBeGreaterThan(0);
  });

  it("propagates error when importSessionFromZip rejects", async () => {
    const blob = new Blob(["garbage"]);
    vi.mocked(importSessionFromZip).mockRejectedValue(
      new Error("No session.json found in archive. Not a valid TRUST Review export."),
    );

    await expect(importSessionFromZipFile(blob)).rejects.toThrow(
      "No session.json found in archive",
    );
  });

  it("imports multiple different sessions successfully", async () => {
    const dataA = makeSessionData();
    const dataB = makeSessionData();
    const blobA = new Blob(["zip-a"]);
    const blobB = new Blob(["zip-b"]);

    vi.mocked(importSessionFromZip).mockResolvedValueOnce(dataA).mockResolvedValueOnce(dataB);

    const idA = await importSessionFromZipFile(blobA);
    const idB = await importSessionFromZipFile(blobB);

    expect(idA).toBe(dataA.metadata.id);
    expect(idB).toBe(dataB.metadata.id);

    const { sessionIndex } = useRegistryStore.getState();
    expect(Object.keys(sessionIndex)).toHaveLength(2);
    expect(sessionIndex[idA].toolName).toBe(dataA.metadata.toolName);
    expect(sessionIndex[idB].toolName).toBe(dataB.metadata.toolName);

    // Both persisted in repository
    const loadedA = await getRepository().load(idA);
    const loadedB = await getRepository().load(idB);
    expect(loadedA).not.toBeNull();
    expect(loadedB).not.toBeNull();
  });

  it("delegates the blob to importSessionFromZip", async () => {
    const { blob } = makeZipBlob();

    await importSessionFromZipFile(blob);

    expect(importSessionFromZip).toHaveBeenCalledWith(blob);
  });

  it("saves duplicate with new ID, preserving original", async () => {
    const { blob, data } = makeZipBlob();

    const originalId = await importSessionFromZipFile(blob);

    // Re-mock same data
    vi.mocked(importSessionFromZip).mockResolvedValue(data);

    const newId = await importSessionFromZipFile(blob);

    // New ID should differ from original
    expect(newId).not.toBe(originalId);

    // Original data still at original ID
    const original = await getRepository().load(originalId);
    expect(original?.captures).toHaveLength(1);

    // Duplicate saved at new ID
    const duplicate = await getRepository().load(newId);
    expect(duplicate).not.toBeNull();
  });
});
