import { describe, it, expect } from "bun:test";
import { type ReadStream, type WriteStream } from "tinky";
import {
  detectTermcap,
  DEFAULT_DETECTION_TIMEOUT,
  resetForTesting,
  type TermcapInfo,
} from "../src/utils/detect-termcap.js";
import { EventEmitter } from "node:events";

describe("queryTerminalFeatures", () => {
  it("should return TermcapInfo with isReady: true", async () => {
    const result = await detectTermcap(undefined, undefined, 100);

    expect(result.isReady).toBe(true);
    expect(typeof result.kittyProtocol).toBe("boolean");
    expect(typeof result.modifyOtherKeys).toBe("boolean");
  });

  it("should complete quickly when not in TTY", async () => {
    const startTime = Date.now();
    await detectTermcap(undefined, undefined, 100);
    const endTime = Date.now();

    // Should complete quickly when not TTY
    expect(endTime - startTime).toBeLessThan(500);
  });

  it("should return correct shape", async () => {
    const result = await detectTermcap(undefined, undefined, 100);

    // Check shape
    expect("isReady" in result).toBe(true);
    expect("backgroundColor" in result).toBe(true);
    expect("terminalName" in result).toBe(true);
    expect("kittyProtocol" in result).toBe(true);
    expect("modifyOtherKeys" in result).toBe(true);
  });

  it("should return defaults when not TTY", async () => {
    const result = await detectTermcap(undefined, undefined, 100);

    // In test environment (non-TTY), should return defaults
    expect(result.isReady).toBe(true);
    expect(result.kittyProtocol).toBe(false);
    expect(result.modifyOtherKeys).toBe(false);
    // backgroundColor and terminalName can be undefined
    expect(
      result.backgroundColor === undefined ||
        typeof result.backgroundColor === "string",
    ).toBe(true);
    expect(
      result.terminalName === undefined ||
        typeof result.terminalName === "string",
    ).toBe(true);
  });

  it("should use injected IO streams", async () => {
    const stdin = new EventEmitter() as EventEmitter & ReadStream;
    stdin.isTTY = true;
    const stdout: WriteStream = {
      write: (data: string) => {
        // Simulate response for terminal name
        if (data.includes("[>q")) {
          // Send response back to stdin
          setTimeout(() => {
            stdin.emit("data", Buffer.from("\x1bP>|xterm(test)\x1b\\"));
            // Finish detection detection by sending device attributes response
            stdin.emit("data", Buffer.from("\x1b[?62;c"));
          }, 10);
        }
        return true;
      },
    };

    const result = await detectTermcap(stdin, stdout, 100);

    expect(result.terminalName).toBe("xterm(test)");
  });
});

describe("DEFAULT_DETECTION_TIMEOUT", () => {
  it("should be 1000ms", () => {
    expect(DEFAULT_DETECTION_TIMEOUT).toBe(1000);
  });
});

describe("resetForTesting", () => {
  it("should be callable without error", () => {
    expect(() => resetForTesting()).not.toThrow();
  });
});

describe("TermcapInfo interface", () => {
  it("should match expected shape", () => {
    const info: TermcapInfo = {
      isReady: true,
      backgroundColor: "#ffffff",
      terminalName: "xterm",
      kittyProtocol: true,
      modifyOtherKeys: true,
    };

    expect(info.isReady).toBe(true);
    expect(info.backgroundColor).toBe("#ffffff");
    expect(info.terminalName).toBe("xterm");
    expect(info.kittyProtocol).toBe(true);
    expect(info.modifyOtherKeys).toBe(true);
  });

  it("should allow undefined values", () => {
    const info: TermcapInfo = {
      isReady: false,
      backgroundColor: undefined,
      terminalName: undefined,
      kittyProtocol: false,
      modifyOtherKeys: false,
    };

    expect(info.isReady).toBe(false);
    expect(info.backgroundColor).toBeUndefined();
    expect(info.terminalName).toBeUndefined();
  });
});
