[**tinky-termcap**](../README.md)

---

[tinky-termcap](../globals.md) / TermcapInfo

# Interface: TermcapInfo

Detected terminal capabilities information.

This interface represents the result of terminal capability detection,
containing information about various terminal features and settings.

## Example

```typescript
import type { TermcapInfo } from "tinky-termcap";

// Default state before detection
const defaultCaps: TermcapInfo = {
  isReady: false,
  backgroundColor: undefined,
  terminalName: undefined,
  kittyProtocol: false,
  modifyOtherKeys: false,
};

// After detection completes
const detectedCaps: TermcapInfo = {
  isReady: true,
  backgroundColor: "#1a1a1a",
  terminalName: "xterm(388)",
  kittyProtocol: true,
  modifyOtherKeys: true,
};
```

## Properties

### backgroundColor

> **backgroundColor**: `string` \| `undefined`

Terminal background color in `#rrggbb` format.

Detected via OSC 11 query. Will be `undefined` if:

- The terminal doesn't support OSC 11
- Detection timed out before receiving a response
- Running in a non-TTY environment

#### Example

```typescript
function isDarkBackground(color: string | undefined): boolean {
  if (!color) return true; // Assume dark if unknown

  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
```

---

### isReady

> **isReady**: `boolean`

Whether capability detection has completed.

This is `false` during detection and becomes `true` once detection
finishes (either successfully or via timeout).

#### Example

```tsx
const { isReady } = useTermcap();

if (!isReady) {
  return <Text>Detecting terminal capabilities...</Text>;
}
```

---

### kittyProtocol

> **kittyProtocol**: `boolean`

Whether Kitty keyboard protocol is supported.

When `true`, the terminal supports the enhanced Kitty keyboard protocol,
which provides:

- Key release events
- Separate modifier key events
- Unicode code points for all keys
- Disambiguation of similar key sequences

#### Example

```typescript
import { useTermcap } from "tinky-termcap";

function useKeyboardMode() {
  const { kittyProtocol } = useTermcap();

  useEffect(() => {
    if (kittyProtocol) {
      // Enable Kitty keyboard protocol
      process.stdout.write("\x1b[>1u");
      return () => {
        // Disable on cleanup
        process.stdout.write("\x1b[<u");
      };
    }
  }, [kittyProtocol]);
}
```

#### See

https://sw.kovidgoyal.net/kitty/keyboard-protocol/

---

### modifyOtherKeys

> **modifyOtherKeys**: `boolean`

Whether modifyOtherKeys mode is supported at level 2 or higher.

When `true`, the terminal can disambiguate key sequences like:

- `Ctrl+I` vs `Tab`
- `Ctrl+M` vs `Enter`
- `Ctrl+[` vs `Escape`

This enables more precise keyboard handling in terminal applications.

#### Example

```typescript
const { modifyOtherKeys } = useTermcap();

if (modifyOtherKeys) {
  console.log("Can distinguish Ctrl+I from Tab");
}
```

#### See

https://invisible-island.net/xterm/ctlseqs/ctlseqs.html

---

### terminalName

> **terminalName**: `string` \| `undefined`

Terminal emulator name and version string.

Detected via XTVERSION query. Format varies by terminal:

- xterm: `"xterm(388)"`
- kitty: `"kitty(0.31.0)"`
- WezTerm: `"WezTerm 20230712-072601-f4abf8fd"`

Will be `undefined` if the terminal doesn't respond to XTVERSION.

#### Example

```typescript
function supportsImageProtocol(terminalName: string | undefined): boolean {
  if (!terminalName) return false;
  return (
    terminalName.includes("kitty") ||
    terminalName.includes("WezTerm") ||
    terminalName.includes("iTerm")
  );
}
```
