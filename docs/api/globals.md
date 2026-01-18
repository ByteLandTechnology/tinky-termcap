[**tinky-termcap**](README.md)

---

# tinky-termcap

tinky-termcap - Terminal capability detection for Tinky applications.

This library provides React hooks and utilities for detecting terminal
capabilities such as:

- **Background color** - Detect light/dark themes via OSC 11
- **Terminal name** - Identify the terminal emulator (xterm, kitty, etc.)
- **Kitty keyboard protocol** - Enhanced keyboard input handling
- **modifyOtherKeys** - Key sequence disambiguation (Ctrl+I vs Tab)

## Examples

```tsx
import { render } from "tinky";
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

```typescript
import { detectTermcap } from "tinky-termcap";

async function main() {
  process.stdin.setRawMode(true);
  const caps = await detectTermcap(process.stdin, process.stdout, 1000);

  console.log("Terminal:", caps.terminalName);
  console.log("Background:", caps.backgroundColor);
  console.log("Kitty:", caps.kittyProtocol);
  console.log("modifyOtherKeys:", caps.modifyOtherKeys);
}
```

## Interfaces

- [TermcapInfo](interfaces/TermcapInfo.md)
- [TermcapProviderProps](interfaces/TermcapProviderProps.md)

## Variables

- [DEFAULT_DETECTION_TIMEOUT](variables/DEFAULT_DETECTION_TIMEOUT.md)

## Functions

- [detectTermcap](functions/detectTermcap.md)
- [TermcapProvider](functions/TermcapProvider.md)
- [useTermcap](functions/useTermcap.md)
