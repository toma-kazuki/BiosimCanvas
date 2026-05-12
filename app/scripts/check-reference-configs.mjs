// Verify BioSim .biosim files from a local biosim-as-reference checkout against
// BioSimCanvas: parse, structural validation, and round-trip count parity.
//
// Usage:
//   node scripts/check-reference-configs.mjs [configurationDir]
//
// Env:
//   BIOSIM_CONFIG_DIR — overrides default directory
//
// Default directory: <repoRoot>/biosim-as-reference/configuration
// (see README — clone https://github.com/traclabs/biosim.git biosim-as-reference)

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(__dirname, "../..");

const defaultConfigDir = resolve(repoRoot, "biosim-as-reference/configuration");
const configDir = process.env.BIOSIM_CONFIG_DIR?.trim() || process.argv[2] || defaultConfigDir;

/** @param {string} dir */
function* walkBiosimFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`Cannot read directory: ${dir}\n${e.message}`);
    process.exit(1);
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield* walkBiosimFiles(p);
    else if (ent.name.toLowerCase().endsWith(".biosim")) yield p;
  }
}

const tmp = mkdtempSync(join(tmpdir(), "biosim-cfg-"));
const entry = join(tmp, "entry.mjs");
writeFileSync(
  entry,
  `export { parseBiosim } from ${JSON.stringify(resolve(appRoot, "src/io/parseBiosim.ts"))};
export { emitBiosim } from ${JSON.stringify(resolve(appRoot, "src/io/emitBiosim.ts"))};
export { validateStructural } from ${JSON.stringify(resolve(appRoot, "src/domain/structuralValidation.ts"))};`,
);

const outDir = join(tmp, "dist");
await build({
  root: appRoot,
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
    rollupOptions: { external: [] },
  },
});

const mod = await import(`file://${join(outDir, "bundle.mjs")}`);
const { parseBiosim, emitBiosim, validateStructural } = mod;

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

let stat;
try {
  stat = statSync(configDir);
} catch (e) {
  console.error(
    `Configuration directory not found:\n  ${configDir}\n\n` +
      `Clone BioSim alongside this repo (gitignored):\n` +
      `  git clone https://github.com/traclabs/biosim.git biosim-as-reference\n\n` +
      `Or pass a path: node scripts/check-reference-configs.mjs /path/to/configuration`,
  );
  process.exit(1);
}
if (!stat.isDirectory()) {
  console.error(`Not a directory: ${configDir}`);
  process.exit(1);
}

const paths = [...walkBiosimFiles(configDir)].sort();
if (paths.length === 0) {
  console.error(`No .biosim files under ${configDir}`);
  process.exit(1);
}

console.log(`Checking ${paths.length} file(s) under ${configDir}\n`);

let parseFails = 0;
let roundtripFails = 0;

for (const abs of paths) {
  const rel = relative(repoRoot, abs) || abs;
  const xml = readFileSync(abs, "utf8");
  let doc1;
  try {
    doc1 = parseBiosim(xml, rel);
  } catch (e) {
    parseFails++;
    console.log(`FAIL parse  ${rel}`);
    console.log(`         ${e.message}`);
    continue;
  }

  let roundtripOk = true;
  try {
    const xml2 = emitBiosim(doc1);
    const doc2 = parseBiosim(xml2, `${rel}#roundtrip`);
    const a = summarize(doc1);
    const b = summarize(doc2);
    for (const k of Object.keys(a)) {
      if (a[k] !== b[k]) {
        roundtripOk = false;
        console.log(`FAIL round-trip ${rel} — ${k}: ${a[k]} → ${b[k]}`);
      }
    }
  } catch (e) {
    roundtripOk = false;
    console.log(`FAIL round-trip ${rel}: ${e.message}`);
  }
  if (!roundtripOk) roundtripFails++;

  const issues = validateStructural(doc1);
  const warn = issues.filter((i) => i.severity === "warn").length;
  const info = issues.filter((i) => i.severity === "info").length;
  const unknownRoot = doc1.unknownRoot?.length ?? 0;

  if (roundtripOk) {
    console.log(
      `ok  ${rel} — modules=${doc1.modules.length}, sensors=${doc1.sensors.length}, validation: ${warn} warn, ${info} info, unknownRoot=${unknownRoot}`,
    );
    if (warn + info > 0 && process.env.VERBOSE === "1") {
      for (const i of issues) {
        console.log(`      [${i.severity}] ${i.code}: ${i.message}`);
      }
    }
  }
}

console.log("");
if (parseFails || roundtripFails) {
  console.log(
    `Summary: ${paths.length} files — ${parseFails} parse failure(s), ${roundtripFails} round-trip failure(s).`,
  );
  process.exit(1);
}
console.log(`Summary: all ${paths.length} files parsed and round-tripped with matching structural counts.`);
console.log(`(Re-run with VERBOSE=1 to print every structural validation issue.)`);
