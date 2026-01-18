/**
 * tinky-termcap - Terminal capability detection for Tinky applications.
 *
 * This library provides React hooks and utilities for detecting terminal
 * capabilities such as:
 * - **Background color** - Detect light/dark themes via OSC 11
 * - **Terminal name** - Identify the terminal emulator (xterm, kitty, etc.)
 * - **Kitty keyboard protocol** - Enhanced keyboard input handling
 * - **modifyOtherKeys** - Key sequence disambiguation (Ctrl+I vs Tab)
 *
 * @example Quick start
 * ```tsx
 * import { render } from "tinky";
 * import { TermcapProvider, useTermcap } from "tinky-termcap";
 *
 * function App() {
 *   const { isReady, backgroundColor, terminalName, kittyProtocol } = useTermcap();
 *
 *   if (!isReady) {
 *     return <Text>Detecting terminal capabilities...</Text>;
 *   }
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Text>Terminal: {terminalName ?? "Unknown"}</Text>
 *       <Text>Background: {backgroundColor ?? "Unknown"}</Text>
 *       <Text>Kitty Protocol: {kittyProtocol ? "Supported" : "Not supported"}</Text>
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
 * @example Direct detection (without React)
 * ```typescript
 * import { detectTermcap } from "tinky-termcap";
 *
 * async function main() {
 *   process.stdin.setRawMode(true);
 *   const caps = await detectTermcap(process.stdin, process.stdout, 1000);
 *
 *   console.log("Terminal:", caps.terminalName);
 *   console.log("Background:", caps.backgroundColor);
 *   console.log("Kitty:", caps.kittyProtocol);
 *   console.log("modifyOtherKeys:", caps.modifyOtherKeys);
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * React context provider for terminal capability detection.
 *
 * Wrap your application in `TermcapProvider` to enable automatic terminal
 * capability detection. Child components can then use `useTermcap()` to
 * access the detected capabilities.
 *
 * @see {@link TermcapProviderProps} for configuration options
 */
export {
  TermcapProvider,
  type TermcapInfo,
  type TermcapProviderProps,
} from "./contexts/TermcapContext.js";

/**
 * React hook for accessing terminal capabilities.
 *
 * Must be used within a `TermcapProvider`. Returns a `TermcapInfo` object
 * containing the detected terminal capabilities.
 *
 * @see {@link TermcapInfo} for the shape of returned data
 */
export { useTermcap } from "./hooks/use-termcap.js";

/**
 * Low-level terminal capability detection function.
 *
 * Use this directly when you need capability detection outside of React,
 * or when you need more control over the detection process.
 */
export { detectTermcap } from "./utils/detect-termcap.js";

/**
 * Re-export additional types and constants for advanced usage.
 */
export { DEFAULT_DETECTION_TIMEOUT } from "./utils/detect-termcap.js";
