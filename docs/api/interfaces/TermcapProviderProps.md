[**tinky-termcap**](../README.md)

---

[tinky-termcap](../globals.md) / TermcapProviderProps

# Interface: TermcapProviderProps

Props for the `TermcapProvider` component.

## Example

```tsx
<TermcapProvider
  timeout={500}
  initialCapabilities={{
    isReady: true,
    backgroundColor: "#000000",
    terminalName: "test-terminal",
    kittyProtocol: true,
    modifyOtherKeys: false,
  }}
>
  <App />
</TermcapProvider>
```

## Properties

### children

> **children**: `ReactNode`

Child components that will have access to terminal capabilities
via the `useTermcap` hook.

#### Example

```tsx
<TermcapProvider>
  <Header />
  <MainContent />
  <Footer />
</TermcapProvider>
```

---

### initialCapabilities?

> `optional` **initialCapabilities**: [`TermcapInfo`](TermcapInfo.md)

Skip detection and use provided capabilities.

When provided, the component will not perform any terminal queries
and will immediately use these values. This is primarily useful for:

- Testing components that depend on specific capabilities
- Server-side rendering where detection is not possible
- Programmatic control of capability values

#### Examples

```tsx
import { render } from "@testing-library/react";

test("renders with Kitty support", () => {
  const { getByText } = render(
    <TermcapProvider
      initialCapabilities={{
        isReady: true,
        backgroundColor: "#1a1a1a",
        terminalName: "kitty(0.31.0)",
        kittyProtocol: true,
        modifyOtherKeys: true,
      }}
    >
      <MyComponent />
    </TermcapProvider>,
  );

  expect(getByText("Kitty: yes")).toBeInTheDocument();
});
```

```tsx
// On the server, detection is not possible
const ssrCapabilities: TermcapInfo = {
  isReady: true,
  backgroundColor: undefined,
  terminalName: undefined,
  kittyProtocol: false,
  modifyOtherKeys: false,
};

function SSRApp() {
  return (
    <TermcapProvider initialCapabilities={ssrCapabilities}>
      <App />
    </TermcapProvider>
  );
}
```

---

### timeout?

> `optional` **timeout**: `number`

Detection timeout in milliseconds.

The maximum time to wait for terminal responses before returning
with whatever capabilities have been detected. Lower values mean
faster startup but may miss slow-responding features.

#### Default Value

```ts
1000 (1 second)
```

#### Examples

```tsx
<TermcapProvider timeout={200}>
  <App />
</TermcapProvider>
```

```tsx
<TermcapProvider timeout={3000}>
  <App />
</TermcapProvider>
```
