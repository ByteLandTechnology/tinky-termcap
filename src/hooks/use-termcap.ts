/**
 * @fileoverview React hook for accessing terminal capability information.
 *
 * This module provides the `useTermcap` hook, which is the primary way to
 * access detected terminal capabilities in React components.
 *
 * @example Basic usage
 * ```tsx
 * import { TermcapProvider, useTermcap } from "tinky-termcap";
 *
 * function TerminalInfo() {
 *   const { isReady, backgroundColor, terminalName } = useTermcap();
 *
 *   if (!isReady) {
 *     return <Text>Detecting terminal capabilities...</Text>;
 *   }
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Text>Terminal: {terminalName ?? "Unknown"}</Text>
 *       <Text>Background: {backgroundColor ?? "Unknown"}</Text>
 *     </Box>
 *   );
 * }
 *
 * function App() {
 *   return (
 *     <TermcapProvider>
 *       <TerminalInfo />
 *     </TermcapProvider>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import { TermcapContext } from "../contexts/TermcapContext.js";
import { type TermcapInfo } from "../utils/detect-termcap.js";

/**
 * React hook to access terminal capability information.
 *
 * This hook provides access to the `TermcapInfo` object containing
 * detected terminal capabilities. It must be used within a component
 * that is a descendant of `TermcapProvider`.
 *
 * @returns The current terminal capability information.
 *
 * @throws Error if used outside of a `TermcapProvider`. The error message
 *   will be: "useTermcap must be used within a TermcapProvider"
 *
 * @remarks
 * - The returned `TermcapInfo.isReady` will be `false` until detection completes
 * - Detection typically takes less than 100ms, but may take up to the timeout value
 * - In non-TTY environments (CI, piped input), detection returns immediately with defaults
 *
 * @example Basic usage with loading state
 * ```tsx
 * import { useTermcap } from "tinky-termcap";
 *
 * function MyComponent() {
 *   const { isReady, backgroundColor, kittyProtocol } = useTermcap();
 *
 *   if (!isReady) {
 *     return <Text>Detecting terminal...</Text>;
 *   }
 *
 *   return (
 *     <Box>
 *       <Text>Background: {backgroundColor ?? "unknown"}</Text>
 *       <Text>Kitty: {kittyProtocol ? "yes" : "no"}</Text>
 *     </Box>
 *   );
 * }
 * ```
 *
 * @example Adapting UI based on terminal theme
 * ```tsx
 * import { useTermcap } from "tinky-termcap";
 *
 * function ThemedText({ children }: { children: string }) {
 *   const { backgroundColor } = useTermcap();
 *
 *   // Determine if terminal has dark background
 *   const isDark = useMemo(() => {
 *     if (!backgroundColor) return true; // Assume dark if unknown
 *
 *     const hex = backgroundColor.slice(1);
 *     const r = parseInt(hex.slice(0, 2), 16);
 *     const g = parseInt(hex.slice(2, 4), 16);
 *     const b = parseInt(hex.slice(4, 6), 16);
 *     const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
 *
 *     return luminance < 0.5;
 *   }, [backgroundColor]);
 *
 *   return (
 *     <Text color={isDark ? "white" : "black"}>
 *       {children}
 *     </Text>
 *   );
 * }
 * ```
 *
 * @example Conditional keyboard handling
 * ```tsx
 * import { useTermcap } from "tinky-termcap";
 * import { useInput } from "tinky";
 *
 * function KeyHandler() {
 *   const { kittyProtocol, modifyOtherKeys } = useTermcap();
 *
 *   useInput((input, key) => {
 *     if (kittyProtocol || modifyOtherKeys) {
 *       // Enhanced keyboard handling available
 *       // Can distinguish Ctrl+I from Tab, etc.
 *     } else {
 *       // Fall back to basic handling
 *     }
 *   });
 *
 *   return <Text>Press any key...</Text>;
 * }
 * ```
 *
 * @example Terminal-specific features
 * ```tsx
 * import { useTermcap } from "tinky-termcap";
 *
 * function ImageViewer({ imagePath }: { imagePath: string }) {
 *   const { terminalName, kittyProtocol } = useTermcap();
 *
 *   const supportsImages = useMemo(() => {
 *     if (!terminalName) return false;
 *     return (
 *       terminalName.includes("kitty") ||
 *       terminalName.includes("WezTerm") ||
 *       terminalName.includes("iTerm")
 *     );
 *   }, [terminalName]);
 *
 *   if (!supportsImages) {
 *     return <Text>Image viewing not supported in this terminal</Text>;
 *   }
 *
 *   return <KittyImage src={imagePath} />;
 * }
 * ```
 *
 * @see {@link TermcapProvider} - The provider component that must wrap components using this hook
 * @see {@link TermcapInfo} - The type definition for the returned capabilities object
 */
export function useTermcap(): TermcapInfo {
  const context = useContext(TermcapContext);
  if (!context) {
    throw new Error("useTermcap must be used within a TermcapProvider");
  }
  return context;
}
