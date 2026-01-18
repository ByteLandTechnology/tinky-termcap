[**tinky-termcap**](../README.md)

---

[tinky-termcap](../globals.md) / TermcapProvider

# Function: TermcapProvider()

> **TermcapProvider**(`props`): `ReactElement`

Provider component that detects and provides terminal capabilities.

This component performs terminal capability detection on mount and provides
the results to descendant components via the `useTermcap` hook. It integrates
with Tinky's `useStdin` and `useStdout` hooks to access terminal streams.

## Lifecycle

1. **Mount**: Enables raw mode and sends detection queries to the terminal
2. **Detection**: Listens for terminal responses and parses capabilities
3. **Complete**: Either:
   - All responses received (triggered by Device Attributes response)
   - Timeout reached (returns whatever was detected)
4. **Unmount**: Cleanup (detection may be aborted if still in progress)

## Raw Mode

The provider enables raw mode for detection. After detection completes,
raw mode remains enabled as Tinky applications typically need it. If you
need to manage raw mode differently, use `initialCapabilities` to skip
detection and manage the terminal state yourself.

## Parameters

### props

[`TermcapProviderProps`](../interfaces/TermcapProviderProps.md)

Component props

## Returns

`ReactElement`

React element wrapping children with capability context

## Examples

```tsx
import { render } from "tinky";
import { TermcapProvider, useTermcap } from "tinky-termcap";

function App() {
  const caps = useTermcap();
  return <Text>Terminal: {caps.terminalName ?? "Unknown"}</Text>;
}

render(
  <TermcapProvider>
    <App />
  </TermcapProvider>,
);
```

```tsx
<TermcapProvider timeout={500}>
  <App />
</TermcapProvider>
```

```tsx
<TermcapProvider
  initialCapabilities={{
    isReady: true,
    backgroundColor: "#000000",
    terminalName: "test",
    kittyProtocol: true,
    modifyOtherKeys: false,
  }}
>
  <ComponentUnderTest />
</TermcapProvider>
```

## See

- [useTermcap](useTermcap.md) - Hook to access capabilities in child components
- [TermcapProviderProps](../interfaces/TermcapProviderProps.md) - Available props
- [TermcapInfo](../interfaces/TermcapInfo.md) - Shape of the provided capabilities
