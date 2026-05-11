import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importSessionFromZipFile } from "@/lib/session-lifecycle";
import {
  setRepository,
  resetRepository,
  InMemorySessionRepository,
  getRepository,
} from "@/lib/session-repository";
import { useRegistryStore } from "@/stores/registry";
import { makeMetadata, makeCapture, makeEvaluation } from "./fixtures";
import type { SessionData } from "@/lib/types";

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
    expect(loaded!.metadata.id).toBe(data.metadata.id);
    expect(loaded!.metadata.toolName).toBe(data.metadata.toolName);
    expect(loaded!.captures).toHaveLength(1);
    expect(loaded!.evaluations).toHaveLength(1);
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

    expect(useRegistryStore.getState().activeSessionId).toBe(
      data.metadata.id,
    );
  });

  it("rejects importing a duplicate session with correct message", async () => {
    const { blob, data } = makeZipBlob();

    // First import succeeds
    await importSessionFromZipFile(blob);

    // Re-mock to return same data for second import
    vi.mocked(importSessionFromZip).mockResolvedValue(data);

    await expect(importSessionFromZipFile(blob)).rejects.toThrow(
      `A review of "${data.metadata.toolName}" already exists. Delete it first if you want to re-import.`,
    );
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

    vi.mocked(importSessionFromZip)
      .mockResolvedValueOnce(dataA)
      .mockResolvedValueOnce(dataB);

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
    const { blob, data } = makeZipBlob();

    await importSessionFromZipFile(blob);

    expect(importSessionFromZip).toHaveBeenCalledWith(blob);
  });

  it("does not save to repository if session already exists", async () => {
    const { blob, data } = makeZipBlob();

    await importSessionFromZipFile(blob);

    // Re-mock same data
    vi.mocked(importSessionFromZip).mockResolvedValue(data);

    // Pre-populate registry with the same ID (simulating existing session)
    try {
      await importSessionFromZipFile(blob);
    } catch {
      // Expected to throw
    }

    // Repository should only have one entry
    const loaded = await getRepository().load(data.metadata.id);
    expect(loaded!.captures).toHaveLength(1); // original data, not duplicated
  });
});
