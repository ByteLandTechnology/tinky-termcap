[**tinky-termcap**](../README.md)

---

[tinky-termcap](../globals.md) / DEFAULT_DETECTION_TIMEOUT

# Variable: DEFAULT_DETECTION_TIMEOUT

> `const` **DEFAULT_DETECTION_TIMEOUT**: `1000` = `1000`

Default timeout for capability detection in milliseconds.

This value (1000ms) provides a reasonable balance between:

- Allowing enough time for slow terminals to respond
- Not delaying application startup too long if terminal doesn't respond

## Example

```typescript
import { detectTermcap, DEFAULT_DETECTION_TIMEOUT } from "tinky-termcap";

// Use half the default timeout for faster startup
const caps = await detectTermcap(stdin, stdout, DEFAULT_DETECTION_TIMEOUT / 2);

// Or use a longer timeout for slow connections
const caps = await detectTermcap(stdin, stdout, DEFAULT_DETECTION_TIMEOUT * 2);
```
