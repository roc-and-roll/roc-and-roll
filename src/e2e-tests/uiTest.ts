import os from "os";
import net from "net";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import { spawn } from "child_process";
import getPort from "get-port";
import { test as base } from "@playwright/test";

export const uiTest = base.extend<{ rnrServer: null }, { rnrPort: number }>({
  rnrPort: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const port = await getPort({
        // Make sure that there is no way that two workers ever check for the
        // same port, since that might create a race condition.
        port: possiblePortsForWorker(
          30000 + workerInfo.parallelIndex,
          workerInfo.config.workers
        ),
      });
      await use(port);
    },
    { scope: "worker", auto: true },
  ],
  rnrServer: [
    async ({ rnrPort }, use, testInfo) => {
      const { kill } = await start(rnrPort);
      await use(null);
      await kill();
    },
    { scope: "test", auto: true },
  ],
  baseURL: async ({ rnrPort }, use) => {
    await use(`http://localhost:${rnrPort}`);
  },
  page: async ({ page }, use) => {
    await page.goto("/");
    await use(page);
  },
});

function* possiblePortsForWorker(start: number, step: number) {
  let port = start;
  while (true) {
    yield port;
    port += step;
  }
}

async function start(port: number) {
  const workspace = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "roc-and-roll-e2e-")
  );

  try {
    const executable = path.join("dist", "e2e", "server.roc-and-roll.js");

    if (!fs.existsSync(executable)) {
      console.error(`Could not find e2e build. Did you run "yarn e2e-build"?`);
      process.exit(1);
    }

    const version = (
      await execute(executable, ["--version"]).result
    ).stdout.trim();
    if (!version.endsWith("-e2e-test")) {
      console.error(
        `E2E tests can only be run against an e2e-test build of Roc & Roll, got ${version}`
      );
      process.exit(1);
    }

    const { kill } = execute(executable, [
      "--workspace",
      workspace,
      "--port",
      port.toString(),
    ]);

    await waitForSocket(port, 100);

    return {
      port,
      kill: async () => {
        await fsExtra.remove(workspace);
        kill();
      },
    };
  } catch (err) {
    await fsExtra.remove(workspace);
    throw err;
  }
}

function execute(executable: string, args: string[]) {
  const nodeArgs = ["--unhandled-rejections=strict", "--enable-source-maps"];
  const proc = spawn("node", [...nodeArgs, executable, ...args]);

  const stdoutChunks: Buffer[] = [];
  proc.stdout.on("data", (data: Buffer | string) => {
    stdoutChunks.push(Buffer.from(data));
  });

  const stderrChunks: Buffer[] = [];
  proc.stderr.on("data", (data: Buffer | string) => {
    stderrChunks.push(Buffer.from(data));
  });

  return {
    result: new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        proc.on("close", (code) => {
          const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
          const stderr = Buffer.concat(stderrChunks).toString("utf-8");
          if (code === 0 || code === null) {
            resolve({
              stdout,
              stderr,
            });
          } else {
            reject(
              `Process exited with code ${String(
                code
              )}. stdout: ${stdout}, stderr: ${stderr}`
            );
          }
        });
      }
    ),
    kill: () => proc.kill(),
  };
}

// Based on code from Playwright licensed under the Apache License Version 2.0.
// https://github.dev/microsoft/playwright/blob/c0aecbfd572d727a0f34aad600ddf02e5d88e660/packages/playwright-test/src/webServer.ts#L107-L129
async function isPortUsed(port: number): Promise<boolean> {
  const innerIsPortUsed = (host: string) =>
    new Promise<boolean>((resolve) => {
      const conn = net
        .connect(port, host)
        .on("error", () => {
          resolve(false);
        })
        .on("connect", () => {
          conn.end();
          resolve(true);
        });
    });
  return (await innerIsPortUsed("127.0.0.1")) || (await innerIsPortUsed("::1"));
}

async function waitForSocket(port: number, delay: number) {
  while (true) {
    const connected = await isPortUsed(port);
    if (connected) return;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
