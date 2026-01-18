/**
 * @fileoverview React context and provider for terminal capability detection.
 *
 * This module provides the `TermcapProvider` component, which performs terminal
 * capability detection on mount and makes the results available to child
 * components via the `useTermcap` hook.
 *
 * @example Basic setup
 * ```tsx
 * import { render } from "tinky";
 * import { TermcapProvider, useTermcap } from "tinky-termcap";
 *
 * function App() {
 *   const { isReady, terminalName } = useTermcap();
 *
 *   if (!isReady) {
 *     return <Text>Detecting terminal...</Text>;
 *   }
 *
 *   return <Text>Running in {terminalName ?? "unknown terminal"}</Text>;
 * }
 *
 * render(
 *   <TermcapProvider>
 *     <App />
 *   </TermcapProvider>
 * );
 * ```
 *
 * @packageDocumentation
 */

import type React from "react";
import { createContext, useEffect, useMemo, useState } from "react";
import { useStdin, useStdout } from "tinky";
import {
  detectTermcap,
  type TermcapInfo,
  DEFAULT_DETECTION_TIMEOUT,
} from "../utils/detect-termcap.js";

/**
 * Default termcap info before detection completes.
 *
 * This object is used as the initial state while capability detection
 * is in progress. Note that `isReady` is `false` to indicate detection
 * has not yet completed.
 *
 * @internal
 */
const defaultTermcapInfo: TermcapInfo = {
  isReady: false,
  backgroundColor: undefined,
  terminalName: undefined,
  kittyProtocol: false,
  modifyOtherKeys: false,
};

/**
 * React context for terminal capability information.
 *
 * This context provides `TermcapInfo` to descendant components. Use the
 * `useTermcap` hook instead of accessing this context directly.
 *
 * @example Direct context access (not recommended)
 * ```tsx
 * import { useContext } from "react";
 * import { TermcapContext } from "tinky-termcap";
 *
 * function MyComponent() {
 *   const caps = useContext(TermcapContext);
 *   // Note: caps may be undefined if not within TermcapProvider
 *   // Use useTermcap() hook instead for automatic error handling
 * }
 * ```
 *
 * @see {@link useTermcap} - The recommended way to access capabilities
 */
export const TermcapContext = createContext<TermcapInfo | undefined>(undefined);

/**
 * Props for the `TermcapProvider` component.
 *
 * @example With all props
 * ```tsx
 * <TermcapProvider
 *   timeout={500}
 *   initialCapabilities={{
 *     isReady: true,
 *     backgroundColor: "#000000",
 *     terminalName: "test-terminal",
 *     kittyProtocol: true,
 *     modifyOtherKeys: false,
 *   }}
 * >
 *   <App />
 * </TermcapProvider>
 * ```
 */
export interface TermcapProviderProps {
  /**
   * Child components that will have access to terminal capabilities
   * via the `useTermcap` hook.
   *
   * @example
   * ```tsx
   * <TermcapProvider>
   *   <Header />
   *   <MainContent />
   *   <Footer />
   * </TermcapProvider>
   * ```
   */
  children: React.ReactNode;

  /**
   * Detection timeout in milliseconds.
   *
   * The maximum time to wait for terminal responses before returning
   * with whatever capabilities have been detected. Lower values mean
   * faster startup but may miss slow-responding features.
   *
   * @defaultValue 1000 (1 second)
   *
   * @example Fast startup (may miss some features)
   * ```tsx
   * <TermcapProvider timeout={200}>
   *   <App />
   * </TermcapProvider>
   * ```
   *
   * @example Extended timeout for slow connections
   * ```tsx
   * <TermcapProvider timeout={3000}>
   *   <App />
   * </TermcapProvider>
   * ```
   */
  timeout?: number;

  /**
   * Skip detection and use provided capabilities.
   *
   * When provided, the component will not perform any terminal queries
   * and will immediately use these values. This is primarily useful for:
   * - Testing components that depend on specific capabilities
   * - Server-side rendering where detection is not possible
   * - Programmatic control of capability values
   *
   * @example Testing with mock capabilities
   * ```tsx
   * import { render } from "@testing-library/react";
   *
   * test("renders with Kitty support", () => {
   *   const { getByText } = render(
   *     <TermcapProvider
   *       initialCapabilities={{
   *         isReady: true,
   *         backgroundColor: "#1a1a1a",
   *         terminalName: "kitty(0.31.0)",
   *         kittyProtocol: true,
   *         modifyOtherKeys: true,
   *       }}
   *     >
   *       <MyComponent />
   *     </TermcapProvider>
   *   );
   *
   *   expect(getByText("Kitty: yes")).toBeInTheDocument();
   * });
   * ```
   *
   * @example Server-side rendering
   * ```tsx
   * // On the server, detection is not possible
   * const ssrCapabilities: TermcapInfo = {
   *   isReady: true,
   *   backgroundColor: undefined,
   *   terminalName: undefined,
   *   kittyProtocol: false,
   *   modifyOtherKeys: false,
   * };
   *
   * function SSRApp() {
   *   return (
   *     <TermcapProvider initialCapabilities={ssrCapabilities}>
   *       <App />
   *     </TermcapProvider>
   *   );
   * }
   * ```
   */
  initialCapabilities?: TermcapInfo;
}

/**
 * Provider component that detects and provides terminal capabilities.
 *
 * This component performs terminal capability detection on mount and provides
 * the results to descendant components via the `useTermcap` hook. It integrates
 * with Tinky's `useStdin` and `useStdout` hooks to access terminal streams.
 *
 * ## Lifecycle
 *
 * 1. **Mount**: Enables raw mode and sends detection queries to the terminal
 * 2. **Detection**: Listens for terminal responses and parses capabilities
 * 3. **Complete**: Either:
 *    - All responses received (triggered by Device Attributes response)
 *    - Timeout reached (returns whatever was detected)
 * 4. **Unmount**: Cleanup (detection may be aborted if still in progress)
 *
 * ## Raw Mode
 *
 * The provider enables raw mode for detection. After detection completes,
 * raw mode remains enabled as Tinky applications typically need it. If you
 * need to manage raw mode differently, use `initialCapabilities` to skip
 * detection and manage the terminal state yourself.
 *
 * @param props - Component props
 * @returns React element wrapping children with capability context
 *
 * @example Basic usage
 * ```tsx
 * import { render } from "tinky";
 * import { TermcapProvider, useTermcap } from "tinky-termcap";
 *
 * function App() {
 *   const caps = useTermcap();
 *   return <Text>Terminal: {caps.terminalName ?? "Unknown"}</Text>;
 * }
 *
 * render(
 *   <TermcapProvider>
 *     <App />
 *   </TermcapProvider>
 * );
 * ```
 *
 * @example With custom timeout
 * ```tsx
 * <TermcapProvider timeout={500}>
 *   <App />
 * </TermcapProvider>
 * ```
 *
 * @example For testing
 * ```tsx
 * <TermcapProvider
 *   initialCapabilities={{
 *     isReady: true,
 *     backgroundColor: "#000000",
 *     terminalName: "test",
 *     kittyProtocol: true,
 *     modifyOtherKeys: false,
 *   }}
 * >
 *   <ComponentUnderTest />
 * </TermcapProvider>
 * ```
 *
 * @see {@link useTermcap} - Hook to access capabilities in child components
 * @see {@link TermcapProviderProps} - Available props
 * @see {@link TermcapInfo} - Shape of the provided capabilities
 */
export function TermcapProvider({
  children,
  timeout = DEFAULT_DETECTION_TIMEOUT,
  initialCapabilities,
}: TermcapProviderProps): React.ReactElement {
  const [capabilities, setCapabilities] = useState<TermcapInfo>(
    initialCapabilities ?? defaultTermcapInfo,
  );

  const { stdin, setRawMode } = useStdin();
  const { stdout } = useStdout();

  useEffect(() => {
    // Skip detection if initial capabilities provided
    if (initialCapabilities) {
      return;
    }

    let mounted = true;

    // Enable raw mode for detection
    setRawMode(true);

    detectTermcap(stdin, stdout, timeout).then((result) => {
      if (mounted) {
        setCapabilities(result);
        // We don't disable raw mode here as Tinky applications usually need it.
        // If necessary, the consumer can manage raw mode.
      }
    });

    return () => {
      mounted = false;
    };
  }, [timeout, initialCapabilities, stdin, stdout, setRawMode]);

  const value = useMemo(() => capabilities, [capabilities]);

  return (
    <TermcapContext.Provider value={value}>{children}</TermcapContext.Provider>
  );
}

export type { TermcapInfo };
