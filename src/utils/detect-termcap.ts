/**
 * @fileoverview Terminal capability detection utilities.
 *
 * This module provides functions and types for detecting terminal capabilities
 * by sending escape sequence queries to the terminal and parsing responses.
 * It supports detection of:
 * - Background color (via OSC 11)
 * - Terminal name/version (via XTVERSION)
 * - Kitty keyboard protocol support
 * - modifyOtherKeys mode support
 *
 * @example Basic usage with tinky
 * ```tsx
 * import { TermcapProvider, useTermcap } from "tinky-termcap";
 *
 * function App() {
 *   const { isReady, backgroundColor, kittyProtocol } = useTermcap();
 *
 *   if (!isReady) return <Text>Detecting...</Text>;
 *
 *   return (
 *     <Box>
 *       <Text>Background: {backgroundColor ?? "unknown"}</Text>
 *       <Text>Kitty: {kittyProtocol ? "yes" : "no"}</Text>
 *     </Box>
 *   );
 * }
 *
 * render(
 *   <TermcapProvider>
 *     <App />
 *   </TermcapProvider>
 * );
 * ```
 *
 * @example Direct usage without React
 * ```typescript
 * import { detectTermcap } from "tinky-termcap";
 *
 * async function main() {
 *   const caps = await detectTermcap(process.stdin, process.stdout, 1000);
 *   console.log("Terminal capabilities:", caps);
 * }
 * ```
 *
 * @packageDocumentation
 */

import { ReadStream, WriteStream } from "tinky";
import {
  DeviceAttributesFeature,
  KittyFeature,
  ModifyOtherKeysFeature,
  Osc11Feature,
  TerminalNameFeature,
} from "./term-features.js";

/**
 * Detected terminal capabilities information.
 *
 * This interface represents the result of terminal capability detection,
 * containing information about various terminal features and settings.
 *
 * @example
 * ```typescript
 * import type { TermcapInfo } from "tinky-termcap";
 *
 * // Default state before detection
 * const defaultCaps: TermcapInfo = {
 *   isReady: false,
 *   backgroundColor: undefined,
 *   terminalName: undefined,
 *   kittyProtocol: false,
 *   modifyOtherKeys: false,
 * };
 *
 * // After detection completes
 * const detectedCaps: TermcapInfo = {
 *   isReady: true,
 *   backgroundColor: "#1a1a1a",
 *   terminalName: "xterm(388)",
 *   kittyProtocol: true,
 *   modifyOtherKeys: true,
 * };
 * ```
 */
export interface TermcapInfo {
  /**
   * Whether capability detection has completed.
   *
   * This is `false` during detection and becomes `true` once detection
   * finishes (either successfully or via timeout).
   *
   * @example
   * ```tsx
   * const { isReady } = useTermcap();
   *
   * if (!isReady) {
   *   return <Text>Detecting terminal capabilities...</Text>;
   * }
   * ```
   */
  isReady: boolean;

  /**
   * Terminal background color in `#rrggbb` format.
   *
   * Detected via OSC 11 query. Will be `undefined` if:
   * - The terminal doesn't support OSC 11
   * - Detection timed out before receiving a response
   * - Running in a non-TTY environment
   *
   * @example Adapting to light/dark themes
   * ```typescript
   * function isDarkBackground(color: string | undefined): boolean {
   *   if (!color) return true; // Assume dark if unknown
   *
   *   const hex = color.slice(1);
   *   const r = parseInt(hex.slice(0, 2), 16);
   *   const g = parseInt(hex.slice(2, 4), 16);
   *   const b = parseInt(hex.slice(4, 6), 16);
   *
   *   // Calculate relative luminance
   *   const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
   *   return luminance < 0.5;
   * }
   * ```
   */
  backgroundColor: string | undefined;

  /**
   * Terminal emulator name and version string.
   *
   * Detected via XTVERSION query. Format varies by terminal:
   * - xterm: `"xterm(388)"`
   * - kitty: `"kitty(0.31.0)"`
   * - WezTerm: `"WezTerm 20230712-072601-f4abf8fd"`
   *
   * Will be `undefined` if the terminal doesn't respond to XTVERSION.
   *
   * @example Terminal-specific feature flags
   * ```typescript
   * function supportsImageProtocol(terminalName: string | undefined): boolean {
   *   if (!terminalName) return false;
   *   return terminalName.includes("kitty") ||
   *          terminalName.includes("WezTerm") ||
   *          terminalName.includes("iTerm");
   * }
   * ```
   */
  terminalName: string | undefined;

  /**
   * Whether Kitty keyboard protocol is supported.
   *
   * When `true`, the terminal supports the enhanced Kitty keyboard protocol,
   * which provides:
   * - Key release events
   * - Separate modifier key events
   * - Unicode code points for all keys
   * - Disambiguation of similar key sequences
   *
   * @example Enabling enhanced keyboard handling
   * ```typescript
   * import { useTermcap } from "tinky-termcap";
   *
   * function useKeyboardMode() {
   *   const { kittyProtocol } = useTermcap();
   *
   *   useEffect(() => {
   *     if (kittyProtocol) {
   *       // Enable Kitty keyboard protocol
   *       process.stdout.write("\x1b[>1u");
   *       return () => {
   *         // Disable on cleanup
   *         process.stdout.write("\x1b[<u");
   *       };
   *     }
   *   }, [kittyProtocol]);
   * }
   * ```
   *
   * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
   */
  kittyProtocol: boolean;

  /**
   * Whether modifyOtherKeys mode is supported at level 2 or higher.
   *
   * When `true`, the terminal can disambiguate key sequences like:
   * - `Ctrl+I` vs `Tab`
   * - `Ctrl+M` vs `Enter`
   * - `Ctrl+[` vs `Escape`
   *
   * This enables more precise keyboard handling in terminal applications.
   *
   * @example
   * ```typescript
   * const { modifyOtherKeys } = useTermcap();
   *
   * if (modifyOtherKeys) {
   *   console.log("Can distinguish Ctrl+I from Tab");
   * }
   * ```
   *
   * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
   */
  modifyOtherKeys: boolean;
}

/**
 * Parse RGB color from hex components to #rrggbb format.
 *
 * Terminal color responses use variable-length hex values (1-4 digits per
 * component). This function normalizes them to the standard `#rrggbb` format.
 *
 * @param rHex - Red component in hex (1-4 digits)
 * @param gHex - Green component in hex (1-4 digits)
 * @param bHex - Blue component in hex (1-4 digits)
 * @returns Normalized color string in `#rrggbb` format
 *
 * @example
 * ```typescript
 * // 2-digit hex (most common)
 * parseColor("1a", "1a", "1a"); // "#1a1a1a"
 *
 * // 4-digit hex (some terminals)
 * parseColor("1a1a", "1a1a", "1a1a"); // "#1a1a1a"
 *
 * // 1-digit hex
 * parseColor("f", "0", "0"); // "#ff0000"
 * ```
 *
 * @internal
 */
function parseColor(rHex: string, gHex: string, bHex: string): string {
  const parseComponent = (hex: string) => {
    const val = parseInt(hex, 16);
    if (hex.length === 1) return (val / 15) * 255;
    if (hex.length === 2) return val;
    if (hex.length === 3) return (val / 4095) * 255;
    if (hex.length === 4) return (val / 65535) * 255;
    return val;
  };

  const r = parseComponent(rHex);
  const g = parseComponent(gHex);
  const b = parseComponent(bHex);

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Default timeout for capability detection in milliseconds.
 *
 * This value (1000ms) provides a reasonable balance between:
 * - Allowing enough time for slow terminals to respond
 * - Not delaying application startup too long if terminal doesn't respond
 *
 * @example Custom timeout usage
 * ```typescript
 * import { detectTermcap, DEFAULT_DETECTION_TIMEOUT } from "tinky-termcap";
 *
 * // Use half the default timeout for faster startup
 * const caps = await detectTermcap(stdin, stdout, DEFAULT_DETECTION_TIMEOUT / 2);
 *
 * // Or use a longer timeout for slow connections
 * const caps = await detectTermcap(stdin, stdout, DEFAULT_DETECTION_TIMEOUT * 2);
 * ```
 */
export const DEFAULT_DETECTION_TIMEOUT = 1000;

/**
 * Detect terminal capabilities by querying the terminal.
 *
 * This function sends escape sequence queries to the terminal and parses
 * the responses to determine supported features. It detects:
 * - **Background color** - via OSC 11 query
 * - **Terminal name** - via XTVERSION query
 * - **Kitty protocol** - enhanced keyboard support
 * - **modifyOtherKeys** - key disambiguation support
 *
 * The function uses Device Attributes (DA) as a "sentinel" - when the DA
 * response is received, detection is considered complete since terminals
 * always respond to DA queries.
 *
 * @param stdin - Input stream to read terminal responses from.
 *   If not provided or not a TTY, returns default values immediately.
 * @param stdout - Output stream to write queries to.
 *   If not provided or not a TTY, returns default values immediately.
 * @param timeout - Maximum time to wait for responses in milliseconds.
 *   Defaults to {@link DEFAULT_DETECTION_TIMEOUT} (1000ms).
 * @returns Promise resolving to detected capabilities.
 *
 * @remarks
 * - This function should typically only be called once at app startup
 * - The caller is responsible for enabling raw mode before calling
 * - In non-TTY environments, returns immediately with default values
 *
 * @example Basic usage
 * ```typescript
 * import { detectTermcap } from "tinky-termcap";
 *
 * async function main() {
 *   // Enable raw mode first (required for reading responses)
 *   process.stdin.setRawMode(true);
 *
 *   const caps = await detectTermcap(
 *     process.stdin,
 *     process.stdout,
 *     1000
 *   );
 *
 *   console.log("Detection complete:");
 *   console.log("  Background:", caps.backgroundColor ?? "unknown");
 *   console.log("  Terminal:", caps.terminalName ?? "unknown");
 *   console.log("  Kitty:", caps.kittyProtocol ? "yes" : "no");
 *   console.log("  modifyOtherKeys:", caps.modifyOtherKeys ? "yes" : "no");
 * }
 * ```
 *
 * @example With tinky hooks
 * ```tsx
 * import { useStdin, useStdout } from "tinky";
 * import { detectTermcap } from "tinky-termcap";
 *
 * function DetectionComponent() {
 *   const { stdin, setRawMode } = useStdin();
 *   const { stdout } = useStdout();
 *   const [caps, setCaps] = useState<TermcapInfo | null>(null);
 *
 *   useEffect(() => {
 *     setRawMode(true);
 *     detectTermcap(stdin, stdout, 1000).then(setCaps);
 *   }, []);
 *
 *   if (!caps) return <Text>Detecting...</Text>;
 *   return <Text>Ready!</Text>;
 * }
 * ```
 *
 * @example Testing with mock streams
 * ```typescript
 * import { EventEmitter } from "events";
 * import { ReadStream, WriteStream } from "tinky";
 * import { detectTermcap } from "tinky-termcap";
 *
 * // Create mock streams
 * const mockStdin = new EventEmitter() as ReadStream;
 * (mockStdin as any).isTTY = true;
 *
 * const mockStdout: WriteStream = {
 *   isTTY: true,
 *   write(data: string) {
 *     // Simulate terminal responding to queries
 *     setTimeout(() => {
 *       mockStdin.emit("data", Buffer.from("\x1b[?62;c")); // DA response
 *     }, 10);
 *     return true;
 *   },
 * };
 *
 * const caps = await detectTermcap(mockStdin, mockStdout, 100);
 * ```
 */
export async function detectTermcap(
  stdin?: ReadStream,
  stdout?: WriteStream,
  timeout?: number,
): Promise<TermcapInfo> {
  // Default result for non-TTY environments
  const defaultResult: TermcapInfo = {
    isReady: true,
    backgroundColor: undefined,
    terminalName: undefined,
    kittyProtocol: false,
    modifyOtherKeys: false,
  };

  // Skip detection if not TTY
  if (stdin?.isTTY === false) {
    return defaultResult;
  }

  return new Promise((resolve) => {
    // Assumption: Caller handles raw mode (e.g. via Tinky useStdin)

    let buffer = "";
    let backgroundColor: string | undefined;
    let terminalName: string | undefined;
    let kittyProtocol = false;
    let modifyOtherKeys = false;

    let bgReceived = false;
    let kittyReceived = false;
    let terminalNameReceived = false;
    let modifyOtherKeysReceived = false;
    let deviceAttributesReceived = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stdin?.off?.("data", onData);
      resolve({
        isReady: true,
        backgroundColor,
        terminalName,
        kittyProtocol,
        modifyOtherKeys,
      });
    };

    const timeoutId = setTimeout(cleanup, timeout);

    const onData = (data: unknown) => {
      buffer += (data as Buffer).toString();

      // Check for background color (OSC 11 response)
      if (!bgReceived) {
        const match = buffer.match(Osc11Feature.responseRegex);
        if (match) {
          bgReceived = true;
          backgroundColor = parseColor(match[1], match[2], match[3]);
        }
      }

      // Check for Kitty keyboard protocol support
      if (!kittyReceived && KittyFeature.responseRegex.test(buffer)) {
        kittyReceived = true;
        kittyProtocol = true;
      }

      // Check for modifyOtherKeys support
      if (!modifyOtherKeysReceived) {
        const match = buffer.match(ModifyOtherKeysFeature.responseRegex);
        if (match) {
          modifyOtherKeysReceived = true;
          const level = parseInt(match[1], 10);
          modifyOtherKeys = level >= 2;
        }
      }

      // Check for terminal name/version
      if (!terminalNameReceived) {
        const match = buffer.match(TerminalNameFeature.responseRegex);
        if (match) {
          terminalNameReceived = true;
          terminalName = match[1];
        }
      }

      // Device Attributes response acts as sentinel - finish when received
      if (!deviceAttributesReceived) {
        const match = buffer.match(DeviceAttributesFeature.responseRegex);
        if (match) {
          deviceAttributesReceived = true;
          cleanup();
        }
      }
    };

    stdin?.on?.("data", onData);

    try {
      stdout?.write(
        KittyFeature.query +
          Osc11Feature.query +
          TerminalNameFeature.query +
          ModifyOtherKeysFeature.query +
          DeviceAttributesFeature.query,
      );
    } catch {
      cleanup();
    }
  });
}

/**
 * Reset module state for testing purposes.
 *
 * This function is provided for test isolation. In the current implementation,
 * there is no module-level state to reset, but this function is maintained
 * for API compatibility.
 *
 * @example
 * ```typescript
 * import { resetForTesting } from "tinky-termcap";
 *
 * beforeEach(() => {
 *   resetForTesting();
 * });
 * ```
 *
 * @internal
 */
export function resetForTesting(): void {
  // No module-level state to reset in the new design
}
