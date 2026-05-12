// Quick stand-alone smoke test: parse template.biosim and dump a summary.
// Run with:  node scripts/smoke.mjs
//
// We use tsx via npx so we can import the TypeScript parser directly. If tsx
// is not available, fall back to running `npm run build` and importing the
// transpiled output is the usual escape hatch; for v0.x this is sufficient.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(
  resolve(__dirname, "../public/templates/template.biosim"),
  "utf8",
);

// Import the parser using a dynamic import via vite-node-style esbuild. Keep
// it simple: shell out to node --loader tsx if installed; otherwise just
// inline-parse using fast-xml-parser the same way the app does.
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: () => true,
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: true,
});

const i = xml.lastIndexOf("</biosim>");
const clipped = i >= 0 ? xml.slice(0, i + "</biosim>".length) : xml;
const tree = parser.parse(clipped);

const root = tree?.biosim?.[0];
if (!root) {
  console.error("ERR: no <biosim> root");
  process.exit(1);
}

let moduleCount = 0;
let endpointCount = 0;
const sim = root.SimBioModules?.[0] ?? {};
for (const sub of Object.keys(sim)) {
  if (sub.startsWith("@_")) continue;
  const subItems = sim[sub] ?? [];
  for (const wrapper of subItems) {
    for (const tag of Object.keys(wrapper)) {
      if (tag.startsWith("@_")) continue;
      const occs = wrapper[tag] ?? [];
      moduleCount += occs.length;
      for (const occ of occs) {
        for (const child of Object.keys(occ)) {
          if (child.startsWith("@_")) continue;
          if (child.endsWith("Consumer") || child.endsWith("Producer")) {
            endpointCount += occ[child].length;
          }
        }
      }
    }
  }
}

let sensorCount = 0;
const sens = root.Sensors?.[0] ?? {};
for (const sub of Object.keys(sens)) {
  if (sub.startsWith("@_")) continue;
  const subItems = sens[sub] ?? [];
  for (const wrapper of subItems) {
    for (const tag of Object.keys(wrapper)) {
      if (tag.startsWith("@_")) continue;
      sensorCount += wrapper[tag].length;
    }
  }
}

console.log("template.biosim parsed");
console.log(`  modules:   ${moduleCount}`);
console.log(`  endpoints: ${endpointCount}`);
console.log(`  sensors:   ${sensorCount}`);
console.log(`  globals.runTillN = ${root.Globals?.[0]?.["@_runTillN"]}`);
