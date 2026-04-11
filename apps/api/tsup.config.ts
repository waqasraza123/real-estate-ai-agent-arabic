import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/server.ts"],
  format: ["esm"],
  noExternal: [/^@real-estate-ai\//],
  outDir: "dist",
  target: "node22"
});
