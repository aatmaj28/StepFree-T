// npm run snapshots: fetch live MBTA data and write the committed offline snapshot.
import { fetchLiveSnapshot } from "../lib/data/mbta-client";
import { SNAPSHOT_FILE, writeSnapshotFile } from "../lib/data/snapshot";

async function main(): Promise<void> {
  const snapshot = await fetchLiveSnapshot();
  const ok = await writeSnapshotFile(snapshot);
  if (!ok) throw new Error(`Could not write ${SNAPSHOT_FILE}`);
  console.log(`Wrote ${SNAPSHOT_FILE}`);
  console.log(
    `stations=${snapshot.stations.length} facilities=${snapshot.facilities.length} alerts=${snapshot.alerts.length} fetchedAt=${snapshot.fetchedAt}`,
  );
}

main().catch((err: unknown) => {
  console.error("Snapshot refresh failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
