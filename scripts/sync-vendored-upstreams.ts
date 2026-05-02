import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findVendoredDrift,
  loadVendoredUpstreams,
  syncVendoredUpstreams,
  updateVendoredManifestRefs,
} from "./lib/vendored-upstreams";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "vendored_upstreams.yml");
const args = new Set(process.argv.slice(2));

function usage(): never {
  console.error("Usage: pnpm sync:vendored [--check|--update]");
  process.exit(2);
}

if (args.size !== 1 || (!args.has("--check") && !args.has("--update"))) usage();

const entries = loadVendoredUpstreams(repoRoot);

if (args.has("--check")) {
  const drift = findVendoredDrift(repoRoot, entries);
  for (const item of drift) {
    console.warn(
      `${item.entry.local} differs from ${item.entry.source} at ${item.currentRef.slice(0, 12)}`,
    );
  }
  if (drift.length) process.exit(1);
  console.log(`Checked ${entries.length} vendored upstream files; no drift.`);
} else {
  const updated = syncVendoredUpstreams(repoRoot, entries);
  updateVendoredManifestRefs(
    manifestPath,
    new Map(updated.map((item) => [item.entry.local, item.currentRef])),
  );
  for (const item of updated) {
    console.log(
      `Synced ${item.entry.local} from ${item.entry.source} at ${item.currentRef.slice(0, 12)}`,
    );
  }
}
