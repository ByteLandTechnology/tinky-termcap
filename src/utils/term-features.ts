/**
 * @fileoverview Terminal feature query definitions for capability detection.
 *
 * This module defines the query sequences and response patterns for detecting
 * various terminal capabilities. Each feature is represented as a `TermFeature`
 * object containing the ANSI escape sequence to query the feature and a regex
 * pattern to match the terminal's response.
 *
 * @example
 * ```typescript
 * import { KittyFeature, Osc11Feature } from "tinky-termcap/utils/term-features";
 *
 * // Send query to terminal
 * process.stdout.write(KittyFeature.query);
 *
 * // Parse response
 * const response = "\\x1b[?1u";
 * if (KittyFeature.responseRegex.test(response)) {
 *   console.log("Kitty keyboard protocol is supported!");
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Interface for terminal feature query definitions.
 *
 * A `TermFeature` encapsulates the information needed to detect a specific
 * terminal capability:
 * - The ANSI escape sequence query to send to the terminal
 * - A regex pattern to match and parse the terminal's response
 *
 * @example Creating a custom feature detector
 * ```typescript
 * import type { TermFeature } from "tinky-termcap";
 *
 * // Define a custom feature to detect sixel graphics support
 * const SixelFeature: TermFeature = {
 *   query: "\x1b[c",  // Request device attributes
 *   responseRegex: /\x1b\[\?[\d;]*4[\d;]*c/,  // Check for "4" in response
 * };
 * ```
 *
 * @see {@link KittyFeature} for Kitty keyboard protocol detection
 * @see {@link Osc11Feature} for background color detection
 * @see {@link TerminalNameFeature} for terminal name detection
 * @see {@link DeviceAttributesFeature} for device attributes detection
 * @see {@link ModifyOtherKeysFeature} for modifyOtherKeys support detection
 */
export interface TermFeature {
  /**
   * ANSI escape sequence query string to send to the terminal.
   *
   * This sequence requests information from the terminal. The terminal
   * will respond with data matching the `responseRegex` pattern if the
   * feature is supported.
   *
   * @example
   * ```typescript
   * // Send the query to stdout
   * process.stdout.write(feature.query);
   * ```
   */
  query: string;

  /**
   * Regular expression pattern to match the terminal's response.
   *
   * The regex may contain capture groups to extract specific values
   * from the response (e.g., color components, version numbers).
   *
   * @example
   * ```typescript
   * // Parse response data
   * const match = data.match(feature.responseRegex);
   * if (match) {
   *   console.log("Feature detected, captured groups:", match.slice(1));
   * }
   * ```
   */
  responseRegex: RegExp;
}

/**
 * Escape character constant used in ANSI escape sequences.
 * @internal
 */
const ESC = "\x1b";

/**
 * Kitty Keyboard Protocol feature definition.
 *
 * The Kitty keyboard protocol provides enhanced keyboard input handling,
 * including:
 * - Distinguishing between key press and key release events
 * - Reporting modifier keys as separate events
 * - Providing Unicode code points for keys
 *
 * **Query sequence:** `ESC [ ? u`
 *
 * **Response format:** `ESC [ ? <flags> u`
 * - `flags` is a decimal number indicating supported features
 *
 * @example Detecting Kitty protocol support
 * ```typescript
 * import { KittyFeature } from "tinky-termcap";
 *
 * // In a detection routine:
 * stdout.write(KittyFeature.query);
 *
 * // When response arrives:
 * const response = "\x1b[?1u";
 * if (KittyFeature.responseRegex.test(response)) {
 *   console.log("Kitty keyboard protocol is supported");
 * }
 * ```
 *
 * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */
export const KittyFeature: TermFeature = {
  query: `${ESC}[?u`,
  responseRegex: new RegExp(`${ESC}\\[\\?(\\d+)u`),
};

/**
 * Background Color detection feature (OSC 11).
 *
 * Queries the terminal's current background color using Operating System
 * Command (OSC) 11. This is useful for:
 * - Adapting UI colors to light/dark themes
 * - Ensuring sufficient contrast for text
 * - Detecting the user's color scheme preference
 *
 * **Query sequence:** `ESC ] 11 ; ? ESC \`
 *
 * **Response format:** `ESC ] 11 ; rgb:<r>/<g>/<b> ST`
 * - `r`, `g`, `b` are hex values (1-4 digits each)
 * - `ST` (String Terminator) is either `ESC \` or `BEL` (0x07)
 *
 * @example Detecting background color
 * ```typescript
 * import { Osc11Feature } from "tinky-termcap";
 *
 * stdout.write(Osc11Feature.query);
 *
 * // Response might be: "\x1b]11;rgb:1a1a/1a1a/1a1a\x1b\\"
 * const match = response.match(Osc11Feature.responseRegex);
 * if (match) {
 *   const [, r, g, b] = match;
 *   console.log(`Background color: rgb(${r}, ${g}, ${b})`);
 * }
 * ```
 *
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Operating-System-Commands
 */
export const Osc11Feature: TermFeature = {
  query: `${ESC}]11;?${ESC}\\`,
  responseRegex: new RegExp(
    `${ESC}\\]11;rgb:([0-9a-fA-F]{1,4})\\/([0-9a-fA-F]{1,4})\\/([0-9a-fA-F]{1,4})(${ESC}\\\\|\\x07)?`,
  ),
};

/**
 * Terminal Name detection feature (XTVERSION).
 *
 * Queries the terminal emulator's name and version using the XTVERSION
 * control sequence. This information can be used for:
 * - Enabling terminal-specific features
 * - Logging and diagnostics
 * - Adapting behavior for known terminal quirks
 *
 * **Query sequence:** `ESC [ > q`
 *
 * **Response format:** `DCS > | <name> ST`
 * - `DCS` is Device Control String (`ESC P`)
 * - `name` is the terminal name/version string
 * - `ST` is String Terminator (`ESC \` or `BEL`)
 *
 * @example Detecting terminal name
 * ```typescript
 * import { TerminalNameFeature } from "tinky-termcap";
 *
 * stdout.write(TerminalNameFeature.query);
 *
 * // Response might be: "\x1bP>|xterm(388)\x1b\\"
 * const match = response.match(TerminalNameFeature.responseRegex);
 * if (match) {
 *   console.log(`Terminal: ${match[1]}`); // "xterm(388)"
 * }
 * ```
 *
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-PC-Style-Function-Keys
 */
export const TerminalNameFeature: TermFeature = {
  query: `${ESC}[>q`,
  responseRegex: new RegExp(`${ESC}P>\\|(.+?)(${ESC}\\\\|\\x07)`),
};

/**
 * Device Attributes detection feature (Primary DA).
 *
 * Queries the terminal's primary device attributes. This is commonly used
 * as a "sentinel" query - terminals always respond to this, making it
 * useful to determine when the terminal has finished responding to all
 * capability queries.
 *
 * **Query sequence:** `ESC [ c`
 *
 * **Response format:** `ESC [ ? <params> c`
 * - `params` is a semicolon-separated list of attribute codes
 *
 * @example Using as detection sentinel
 * ```typescript
 * import { DeviceAttributesFeature, KittyFeature, Osc11Feature } from "tinky-termcap";
 *
 * // Send multiple queries, with DA last as sentinel
 * stdout.write(KittyFeature.query + Osc11Feature.query + DeviceAttributesFeature.query);
 *
 * // When DA response arrives, all other responses have been received
 * if (DeviceAttributesFeature.responseRegex.test(buffer)) {
 *   console.log("Detection complete");
 * }
 * ```
 *
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Device-Status-Report
 */
export const DeviceAttributesFeature: TermFeature = {
  query: `${ESC}[c`,
  responseRegex: new RegExp(`${ESC}\\[\\?(\\d+)(;\\d+)*c`),
};

/**
 * Modify Other Keys feature detection.
 *
 * Queries the current modifyOtherKeys mode level. When enabled at level 2
 * or higher, the terminal sends enhanced key sequences that distinguish
 * between different key combinations (e.g., `Ctrl+I` vs `Tab`).
 *
 * **Query sequence:** `ESC [ > 4 ; ? m`
 *
 * **Response format:** `ESC [ > 4 ; <level> m`
 * - `level` indicates the current modifyOtherKeys mode (0, 1, or 2)
 *
 * Level values:
 * - `0`: Disabled
 * - `1`: Basic mode (some enhanced sequences)
 * - `2`: Full mode (all enhanced sequences)
 *
 * @example Detecting modifyOtherKeys support
 * ```typescript
 * import { ModifyOtherKeysFeature } from "tinky-termcap";
 *
 * stdout.write(ModifyOtherKeysFeature.query);
 *
 * // Response might be: "\x1b[>4;2m"
 * const match = response.match(ModifyOtherKeysFeature.responseRegex);
 * if (match) {
 *   const level = parseInt(match[1], 10);
 *   console.log(`modifyOtherKeys level: ${level}`);
 *   if (level >= 2) {
 *     console.log("Full keyboard disambiguation available");
 *   }
 * }
 * ```
 *
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Functions-using-CSI-_-Desktop-Notification
 */
export const ModifyOtherKeysFeature: TermFeature = {
  query: `${ESC}[>4;?m`,
  responseRegex: new RegExp(`${ESC}\\[>4;(\\d+)m`),
};
