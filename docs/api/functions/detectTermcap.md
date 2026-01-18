[**tinky-termcap**](../README.md)

---

[tinky-termcap](../globals.md) / detectTermcap

# Function: detectTermcap()

> **detectTermcap**(`stdin?`, `stdout?`, `timeout?`): `Promise`\<[`TermcapInfo`](../interfaces/TermcapInfo.md)\>

Detect terminal capabilities by querying the terminal.

This function sends escape sequence queries to the terminal and parses
the responses to determine supported features. It detects:

- **Background color** - via OSC 11 query
- **Terminal name** - via XTVERSION query
- **Kitty protocol** - enhanced keyboard support
- **modifyOtherKeys** - key disambiguation support

The function uses Device Attributes (DA) as a "sentinel" - when the DA
response is received, detection is considered complete since terminals
always respond to DA queries.

## Parameters

### stdin?

`ReadStream`

Input stream to read terminal responses from.
If not provided or not a TTY, returns default values immediately.

### stdout?

`WriteStream`

Output stream to write queries to.
If not provided or not a TTY, returns default values immediately.

### timeout?

`number`

Maximum time to wait for responses in milliseconds.
Defaults to [DEFAULT_DETECTION_TIMEOUT](../variables/DEFAULT_DETECTION_TIMEOUT.md) (1000ms).

## Returns

`Promise`\<[`TermcapInfo`](../interfaces/TermcapInfo.md)\>

Promise resolving to detected capabilities.

## Remarks

- This function should typically only be called once at app startup
- The caller is responsible for enabling raw mode before calling
- In non-TTY environments, returns immediately with default values

## Examples

```typescript
import { detectTermcap } from "tinky-termcap";

async function main() {
  // Enable raw mode first (required for reading responses)
  process.stdin.setRawMode(true);

  const caps = await detectTermcap(process.stdin, process.stdout, 1000);

  console.log("Detection complete:");
  console.log("  Background:", caps.backgroundColor ?? "unknown");
  console.log("  Terminal:", caps.terminalName ?? "unknown");
  console.log("  Kitty:", caps.kittyProtocol ? "yes" : "no");
  console.log("  modifyOtherKeys:", caps.modifyOtherKeys ? "yes" : "no");
}
```

```tsx
import { useStdin, useStdout } from "tinky";
import { detectTermcap } from "tinky-termcap";

function DetectionComponent() {
  const { stdin, setRawMode } = useStdin();
  const { stdout } = useStdout();
  const [caps, setCaps] = useState<TermcapInfo | null>(null);

  useEffect(() => {
    setRawMode(true);
    detectTermcap(stdin, stdout, 1000).then(setCaps);
  }, []);

  if (!caps) return <Text>Detecting...</Text>;
  return <Text>Ready!</Text>;
}
```

```typescript
import { EventEmitter } from "events";
import { ReadStream, WriteStream } from "tinky";
import { detectTermcap } from "tinky-termcap";

// Create mock streams
const mockStdin = new EventEmitter() as ReadStream;
(mockStdin as any).isTTY = true;

const mockStdout: WriteStream = {
  isTTY: true,
  write(data: string) {
    // Simulate terminal responding to queries
    setTimeout(() => {
      mockStdin.emit("data", Buffer.from("\x1b[?62;c")); // DA response
    }, 10);
    return true;
  },
};

const caps = await detectTermcap(mockStdin, mockStdout, 100);
```
