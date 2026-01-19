**tinky-termcap**

---

# tinky-termcap

Terminal capability detection library for [Tinky](https://github.com/ByteLandTechnology/tinky) applications. Provides React hooks and utilities for detecting terminal features like background color, Kitty keyboard protocol support, and modifyOtherKeys mode.

## Features

- 🎨 **Background Color Detection** - Detect terminal theme (light/dark) via OSC 11
- 📝 **Terminal Identification** - Get terminal name and version (xterm, kitty, WezTerm, etc.)
- ⌨️ **Kitty Keyboard Protocol** - Detect enhanced keyboard input support
- 🔧 **modifyOtherKeys** - Detect key sequence disambiguation (Ctrl+I vs Tab)
- ⚛️ **React Integration** - Seamless hooks and context provider for Tinky apps

## Attribution

This project is based on the terminal capability detection implementation from [gemini-cli](https://github.com/google-gemini/gemini-cli).

## Installation

```bash
npm install tinky-termcap
```

**Peer Dependencies:**

- `tinky` >= 1.0.0

## Quick Start

### Using the Provider and Hook

Wrap your application in `TermcapProvider` and use the `useTermcap` hook to access terminal capabilities.

```tsx
import { render, Box, Text } from "tinky";
import { TermcapProvider, useTermcap } from "tinky-termcap";

function App() {
  const { isReady, backgroundColor, terminalName, kittyProtocol } =
    useTermcap();

  if (!isReady) {
    return <Text>Detecting terminal capabilities...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>Terminal: {terminalName ?? "Unknown"}</Text>
      <Text>Background: {backgroundColor ?? "Unknown"}</Text>
      <Text>
        Kitty Protocol: {kittyProtocol ? "Supported" : "Not supported"}
      </Text>
    </Box>
  );
}

render(
  <TermcapProvider>
    <App />
  </TermcapProvider>,
);
```

### Adapting to Terminal Theme

```tsx
import { useTermcap } from "tinky-termcap";
import { useMemo } from "react";

function ThemedComponent() {
  const { backgroundColor } = useTermcap();

  const isDarkTheme = useMemo(() => {
    if (!backgroundColor) return true; // Assume dark if unknown

    const hex = backgroundColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance < 0.5;
  }, [backgroundColor]);

  return (
    <Box borderStyle="round" borderColor={isDarkTheme ? "white" : "black"}>
      <Text color={isDarkTheme ? "cyan" : "blue"}>Adaptive content</Text>
    </Box>
  );
}
```

### Direct Usage (Without React)

```typescript
import { detectTermcap } from "tinky-termcap";

async function main() {
  // Enable raw mode for reading terminal responses
  process.stdin.setRawMode(true);

  const caps = await detectTermcap(process.stdin, process.stdout, 1000);

  console.log("Detection complete:");
  console.log("  Terminal:", caps.terminalName ?? "Unknown");
  console.log("  Background:", caps.backgroundColor ?? "Unknown");
  console.log("  Kitty Protocol:", caps.kittyProtocol ? "Yes" : "No");
  console.log("  modifyOtherKeys:", caps.modifyOtherKeys ? "Yes" : "No");

  process.stdin.setRawMode(false);
  process.exit(0);
}

main();
```

## API Reference

### `TermcapProvider`

React context provider that performs terminal capability detection.

#### Props

| Prop                  | Type              | Default | Description                                          |
| --------------------- | ----------------- | ------- | ---------------------------------------------------- |
| `children`            | `React.ReactNode` | -       | Child components                                     |
| `timeout`             | `number`          | `1000`  | Detection timeout in milliseconds                    |
| `initialCapabilities` | `TermcapInfo`     | -       | Skip detection and use provided values (for testing) |

#### Example with Custom Timeout

```tsx
<TermcapProvider timeout={500}>
  <App />
</TermcapProvider>
```

#### Example for Testing

```tsx
<TermcapProvider
  initialCapabilities={{
    isReady: true,
    backgroundColor: "#1a1a1a",
    terminalName: "xterm-256color",
    kittyProtocol: true,
    modifyOtherKeys: true,
  }}
>
  <ComponentUnderTest />
</TermcapProvider>
```

### `useTermcap()`

React hook to access terminal capabilities. Must be used within `TermcapProvider`.

#### Returns: `TermcapInfo`

| Property          | Type                  | Description                          |
| ----------------- | --------------------- | ------------------------------------ |
| `isReady`         | `boolean`             | Whether detection has completed      |
| `backgroundColor` | `string \| undefined` | Background color in `#rrggbb` format |
| `terminalName`    | `string \| undefined` | Terminal name/version string         |
| `kittyProtocol`   | `boolean`             | Kitty keyboard protocol support      |
| `modifyOtherKeys` | `boolean`             | modifyOtherKeys (level ≥ 2) support  |

#### Example

```tsx
function MyComponent() {
  const { isReady, backgroundColor, kittyProtocol, modifyOtherKeys } =
    useTermcap();

  if (!isReady) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>Background: {backgroundColor ?? "unknown"}</Text>
      <Text>
        Enhanced keyboard: {kittyProtocol || modifyOtherKeys ? "✓" : "✗"}
      </Text>
    </Box>
  );
}
```

### `detectTermcap()`

Low-level function for direct terminal capability detection.

```typescript
function detectTermcap(
  stdin?: IOReadStream,
  stdout?: IOWriteStream,
  timeout?: number,
): Promise<TermcapInfo>;
```

#### Parameters

| Parameter | Type          | Description                            |
| --------- | ------------- | -------------------------------------- |
| `stdin`   | `ReadStream`  | Input stream (e.g., `process.stdin`)   |
| `stdout`  | `WriteStream` | Output stream (e.g., `process.stdout`) |
| `timeout` | `number`      | Detection timeout in milliseconds      |

#### Example

```typescript
import { detectTermcap } from "tinky-termcap";

const caps = await detectTermcap(process.stdin, process.stdout, 1000);
```

### Terminal Features

The library exports feature definitions for advanced use cases:

```typescript
import {
  KittyFeature,
  Osc11Feature,
  TerminalNameFeature,
  DeviceAttributesFeature,
  ModifyOtherKeysFeature,
  type TermFeature,
} from "tinky-termcap/utils/term-features";

// Each feature has:
// - query: ANSI escape sequence to send
// - responseRegex: Pattern to match the response

// Example: Custom detection
process.stdout.write(KittyFeature.query);
// Listen for response matching KittyFeature.responseRegex
```

## How It Works

1. **On Mount**: `TermcapProvider` enables raw mode and sends detection queries
2. **Query Sequence**: Sends escape sequences for each feature:
   - Kitty keyboard protocol query
   - OSC 11 (background color)
   - XTVERSION (terminal name)
   - modifyOtherKeys query
   - Device Attributes (sentinel)
3. **Response Parsing**: Parses terminal responses as they arrive
4. **Completion**: Detection completes when either:
   - Device Attributes response received (indicates all responses sent)
   - Timeout reached

## Detected Terminals

Tested with:

- **xterm** - Full OSC 11 and XTVERSION support
- **kitty** - Kitty protocol, XTVERSION, OSC 11
- **WezTerm** - Full feature support
- **iTerm2** - OSC 11, XTVERSION
- **Alacritty** - OSC 11
- **macOS Terminal** - Basic support
- **VS Code Terminal** - OSC 11

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
bun test

# Generate docs
npm run docs
```

## License

Apache-2.0

See [LICENSE](_media/LICENSE) for details.
