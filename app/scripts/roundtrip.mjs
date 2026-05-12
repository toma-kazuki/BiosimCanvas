// Parse template.biosim with the real TS parser, re-emit it with the real
// TS emitter, then parse the re-emission again and verify the structural
// counts match. This guards F-EXPORT-4 (semantically-equivalent round-trip,
// byte-equivalence not required).
//
// Usage:  node scripts/roundtrip.mjs

import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const TARGETS = [
  "public/templates/template.biosim",
  "public/templates/template-anomalies.biosim",
];

// Use vite's library mode to bundle just the parser+emitter into a CJS file
// in a temp dir, then dynamic-import it. This avoids needing tsx/ts-node and
// works on the same Node 16 the rest of the project uses.

const tmp = mkdtempSync(join(tmpdir(), "biosim-rt-"));
const entry = join(tmp, "entry.mjs");
writeFileSync(
  entry,
  `export { parseBiosim } from ${JSON.stringify(resolve(repoRoot, "src/io/parseBiosim.ts"))};
export { emitBiosim } from ${JSON.stringify(resolve(repoRoot, "src/io/emitBiosim.ts"))};`,
);

const outDir = join(tmp, "dist");
await build({
  root: repoRoot,
  logLevel: "error",
  configFile: false,
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    target: "es2020",
    lib: {
      entry,
      formats: ["es"],
      fileName: () => "bundle.mjs",
    },
    rollupOptions: {
      external: [],
    },
  },
});

const mod = await import(`file://${join(outDir, "bundle.mjs")}`);
const { parseBiosim, emitBiosim } = mod;

const summarize = (d) => ({
  modules: d.modules.length,
  endpoints: d.modules.reduce((n, m) => n + m.endpoints.length, 0),
  refs: d.modules.reduce(
    (n, m) => n + m.endpoints.reduce((k, ep) => k + ep.refs.length, 0),
    0,
  ),
  sensors: d.sensors.length,
  alarms: d.sensors.reduce((n, s) => n + s.alarms.length, 0),
  crewMembers: d.modules.reduce((n, m) => n + (m.crew?.length ?? 0), 0),
  malfunctions: d.modules.filter((m) => m.malfunction).length,
});

let allOk = true;
for (const rel of TARGETS) {
  const xml = readFileSync(resolve(repoRoot, rel), "utf8");
  const doc1 = parseBiosim(xml, rel);
  const xml2 = emitBiosim(doc1);
  const doc2 = parseBiosim(xml2, `${rel}#roundtrip`);

  const a = summarize(doc1);
  const b = summarize(doc2);

  console.log(`\n=== ${rel} ===`);
  console.log("parsed  ", a);
  console.log("rebuilt ", b);

  let ok = true;
  for (const k of Object.keys(a)) {
    if (a[k] !== b[k]) {
      console.error(`MISMATCH ${k}: ${a[k]} vs ${b[k]}`);
      ok = false;
    }
  }
  if (!ok) allOk = false;
}

if (!allOk) process.exit(1);
console.log("\nOK — structural counts match across round-trip for all targets");
