import { runInNewContext } from "node:vm";
import { expect, test } from "vite-plus/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const cli = resolve("bin/signal-spec.mjs");
function run(args: string[], cwd = process.cwd()) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

test("CLI help and argument errors", () => {
  expect(run(["--help"]).stdout).toContain("--backend-uri");
  for (const args of [
    ["generate"],
    ["generate", "--unknown=x"],
    ["generate", "--input"],
    ["generate", "--input=a", "--input=b"],
  ])
    expect(run(args).status).toBe(1);
});

test("generates configured hooks from aliased paths in a separate project", () => {
  const root = mkdtempSync(join(tmpdir(), "signal-spec-cli-"));
  try {
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@/*": ["./*"] },
        },
      }),
    );
    writeFileSync(
      join(root, "spec.json"),
      JSON.stringify({
        hubs: { Test: { hubName: "TestHub", hubContract: { methods: [] } } },
        dtos: {},
      }),
    );
    const backend = 'https://example.com/a"b';
    const result = run(
      ["generate", "--input", "@/spec.json", "--output=@/output folder", "--backend-uri", backend],
      root,
    );
    expect(result.stderr + result.stdout).toContain("Successfully generated");
    expect(result.status).toBe(0);
    const config = readFileSync(join(root, "output folder/config.ts"), "utf8");
    const literal = config.match(/export const backendUri = (.*);/)![1];
    expect(runInNewContext(literal)).toBe(backend);
    const hook = readFileSync(join(root, "output folder/hooks/useTestHub.ts"), "utf8");
    expect(hook).toContain('import "../config.js"');
    expect(hook).toContain("useStableHandlers({})");
    expect(hook).toContain(".createConnection(");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Use an asynchronous child so the fixture server can respond while generation runs.
test("generates from an HTTP spec", async () => {
  const { createServer } = await import("node:http");
  const { spawn } = await import("node:child_process");
  const root = mkdtempSync(join(tmpdir(), "signal-spec-http-"));
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ hubs: {}, dtos: {} }));
  });
  try {
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address() as { port: number };
    const status = await new Promise<number | null>((done, reject) => {
      const child = spawn(
        process.execPath,
        [
          cli,
          "generate",
          `--input=http://127.0.0.1:${address.port}/spec.json`,
          "--output=./generated",
          "--backend-uri=https://example.com",
        ],
        { cwd: root, stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", done);
    });
    expect(status).toBe(0);
    expect(readFileSync(join(root, "generated/hubs.ts"), "utf8")).toContain("never");
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
