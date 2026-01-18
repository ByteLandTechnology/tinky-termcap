import { describe, it, expect, mock } from "bun:test";
import { renderToString } from "react-dom/server";
import { TermcapProvider } from "../src/contexts/TermcapContext.js";
import { useTermcap } from "../src/hooks/use-termcap.js";
import type { TermcapInfo } from "../src/utils/detect-termcap.js";
import { EventEmitter } from "node:events";

// Mock tinky hooks
const mockStdin = new EventEmitter();
const mockStdout = process.stdout;

mock.module("tinky", () => {
  return {
    useStdin: () => ({
      stdin: mockStdin,
      setRawMode: () => {
        /* no-op for testing */
      },
      isRawMode: false,
    }),
    useStdout: () => ({
      stdout: mockStdout,
    }),
  };
});

describe("TermcapProvider", () => {
  it("should render children", () => {
    const html = renderToString(
      <TermcapProvider
        initialCapabilities={{
          isReady: true,
          backgroundColor: undefined,
          terminalName: undefined,
          kittyProtocol: false,
          modifyOtherKeys: false,
        }}
      >
        <div>Hello</div>
      </TermcapProvider>,
    );

    expect(html).toContain("Hello");
  });

  it("should accept timeout prop", () => {
    const html = renderToString(
      <TermcapProvider
        timeout={500}
        initialCapabilities={{
          isReady: true,
          backgroundColor: undefined,
          terminalName: undefined,
          kittyProtocol: false,
          modifyOtherKeys: false,
        }}
      >
        <div>Test</div>
      </TermcapProvider>,
    );

    expect(html).toContain("Test");
  });

  it("should accept initialCapabilities prop", () => {
    const caps: TermcapInfo = {
      isReady: true,
      backgroundColor: "#000000",
      terminalName: "test-terminal",
      kittyProtocol: true,
      modifyOtherKeys: true,
    };

    const html = renderToString(
      <TermcapProvider initialCapabilities={caps}>
        <div>Test</div>
      </TermcapProvider>,
    );

    expect(html).toContain("Test");
  });
});

describe("useTermcap", () => {
  it("should throw when used outside provider", () => {
    function TestComponent() {
      try {
        useTermcap();
        return <div>should not render</div>;
      } catch {
        return <div>error caught</div>;
      }
    }

    const html = renderToString(<TestComponent />);
    expect(html).toContain("error caught");
  });

  it("should return TermcapInfo when used inside provider", () => {
    const caps: TermcapInfo = {
      isReady: true,
      backgroundColor: "#ffffff",
      terminalName: "xterm-256color",
      kittyProtocol: false,
      modifyOtherKeys: false,
    };

    function TestComponent() {
      const info = useTermcap();
      return (
        <div>
          {`ready:${info.isReady},bg:${info.backgroundColor ?? "none"}`}
        </div>
      );
    }

    const html = renderToString(
      <TermcapProvider initialCapabilities={caps}>
        <TestComponent />
      </TermcapProvider>,
    );

    expect(html).toContain("ready:true");
    expect(html).toContain("bg:#ffffff");
  });
});

describe("TermcapInfo type", () => {
  it("should export TermcapInfo type", () => {
    const info: TermcapInfo = {
      isReady: true,
      backgroundColor: undefined,
      terminalName: undefined,
      kittyProtocol: false,
      modifyOtherKeys: false,
    };

    expect(info.isReady).toBe(true);
  });
});
