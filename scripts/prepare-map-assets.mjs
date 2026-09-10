import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("maplibre-gl/package.json"));
const destination = path.resolve("public/maplibre");
await mkdir(destination, { recursive: true });
// MapLibre 6's module worker imports a sibling module, so both keep their original names.
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(source, "dist", name), path.join(destination, name));
}
await copyFile(path.join(source, "LICENSE.txt"), path.join(destination, "LICENSE.txt"));
