import { promises as fs } from "node:fs";
import path from "node:path";
import type { DataSnapshot } from "@/lib/types";
import { cached, DEFAULT_TTL_MS } from "./cache";
import { fetchLiveSnapshot } from "./mbta-client";
import { DataSnapshotSchema } from "./schemas";

export const SNAPSHOT_DIR = path.join(process.cwd(), "lib", "data", "snapshots");
export const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, "mbta-snapshot.json");

/** Raised only when BOTH the live fetch and the committed snapshot fail. The engine layer turns it into UNKNOWN. */
export class DataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataUnavailableError";
  }
}

export async function writeSnapshotFile(snapshot: DataSnapshot): Promise<boolean> {
  try {
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
    await fs.writeFile(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
    return true;
  } catch {
    return false; // read-only filesystem (Vercel): ignore.
  }
}

export async function readSnapshotFile(): Promise<DataSnapshot> {
  const text = await fs.readFile(SNAPSHOT_FILE, "utf8");
  const parsed = DataSnapshotSchema.parse(JSON.parse(text));
  return { ...parsed, source: "snapshot" };
}

function shouldWriteSnapshots(): boolean {
  return process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1" && process.env.SNAPSHOT_WRITE !== "0";
}

function isForcedOffline(): boolean {
  return process.env.FORCE_OFFLINE === "1";
}

async function loadLive(): Promise<DataSnapshot> {
  if (isForcedOffline()) throw new Error("FORCE_OFFLINE=1");
  const live = await fetchLiveSnapshot();
  if (shouldWriteSnapshots()) await writeSnapshotFile(live);
  return live;
}

/**
 * Live data (cached 60s, in-flight de-duplicated) -> committed snapshot -> DataUnavailableError.
 * The snapshot keeps its ORIGINAL fetchedAt, so the engine sees it as stale and answers UNKNOWN.
 */
export async function getSnapshot(): Promise<DataSnapshot> {
  try {
    return await cached("mbta:live", DEFAULT_TTL_MS, loadLive);
  } catch (liveError) {
    try {
      return await readSnapshotFile();
    } catch (fileError) {
      const live = liveError instanceof Error ? liveError.message : String(liveError);
      const file = fileError instanceof Error ? fileError.message : String(fileError);
      throw new DataUnavailableError(`Live MBTA data failed (${live}) and no usable snapshot (${file}).`);
    }
  }
}
