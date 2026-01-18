# tinky-termcap

[Tinky](https://github.com/ByteLandTechnology/tinky) 应用程序的终端能力检测库。提供 React 钩子和工具函数，用于检测终端特性，如背景颜色、Kitty 键盘协议支持和 modifyOtherKeys 模式。

## 特性

- 🎨 **背景颜色检测** - 通过 OSC 11 检测终端主题（亮色/暗色）
- 📝 **终端识别** - 获取终端名称和版本（xterm、kitty、WezTerm 等）
- ⌨️ **Kitty 键盘协议** - 检测增强键盘输入支持
- 🔧 **modifyOtherKeys** - 检测按键序列区分（Ctrl+I 与 Tab）
- ⚛️ **React 集成** - 为 Tinky 应用提供无缝的钩子和上下文提供者

## 致谢

本项目基于 [gemini-cli](https://github.com/google-gemini/gemini-cli) 的终端能力检测实现。

## 安装

```bash
npm install tinky-termcap
```

**对等依赖：**

- `tinky` >= 1.0.0

## 快速开始

### 使用 Provider 和 Hook

用 `TermcapProvider` 包装您的应用程序，并使用 `useTermcap` 钩子访问终端能力。

```tsx
import { render, Box, Text } from "tinky";
import { TermcapProvider, useTermcap } from "tinky-termcap";

function App() {
  const { isReady, backgroundColor, terminalName, kittyProtocol } =
    useTermcap();

  if (!isReady) {
    return <Text>正在检测终端能力...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>终端：{terminalName ?? "未知"}</Text>
      <Text>背景色：{backgroundColor ?? "未知"}</Text>
      <Text>Kitty 协议：{kittyProtocol ? "支持" : "不支持"}</Text>
    </Box>
  );
}

render(
  <TermcapProvider>
    <App />
  </TermcapProvider>,
);
```

### 适应终端主题

```tsx
import { useTermcap } from "tinky-termcap";
import { useMemo } from "react";

function ThemedComponent() {
  const { backgroundColor } = useTermcap();

  const isDarkTheme = useMemo(() => {
    if (!backgroundColor) return true; // 未知时假设为暗色

    const hex = backgroundColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance < 0.5;
  }, [backgroundColor]);

  return (
    <Box borderStyle="round" borderColor={isDarkTheme ? "white" : "black"}>
      <Text color={isDarkTheme ? "cyan" : "blue"}>自适应内容</Text>
    </Box>
  );
}
```

### 直接使用（不使用 React）

```typescript
import { detectTermcap } from "tinky-termcap";

async function main() {
  // 启用原始模式以读取终端响应
  process.stdin.setRawMode(true);

  const caps = await detectTermcap(process.stdin, process.stdout, 1000);

  console.log("检测完成：");
  console.log("  终端：", caps.terminalName ?? "未知");
  console.log("  背景色：", caps.backgroundColor ?? "未知");
  console.log("  Kitty 协议：", caps.kittyProtocol ? "是" : "否");
  console.log("  modifyOtherKeys：", caps.modifyOtherKeys ? "是" : "否");

  process.stdin.setRawMode(false);
  process.exit(0);
}

main();
```

## API 参考

### `TermcapProvider`

执行终端能力检测的 React 上下文提供者。

#### 属性

| 属性                  | 类型              | 默认值 | 描述                               |
| --------------------- | ----------------- | ------ | ---------------------------------- |
| `children`            | `React.ReactNode` | -      | 子组件                             |
| `timeout`             | `number`          | `1000` | 检测超时时间（毫秒）               |
| `initialCapabilities` | `TermcapInfo`     | -      | 跳过检测并使用提供的值（用于测试） |

#### 自定义超时示例

```tsx
<TermcapProvider timeout={500}>
  <App />
</TermcapProvider>
```

#### 测试示例

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

访问终端能力的 React 钩子。必须在 `TermcapProvider` 内部使用。

#### 返回值：`TermcapInfo`

| 属性              | 类型                  | 描述                            |
| ----------------- | --------------------- | ------------------------------- |
| `isReady`         | `boolean`             | 检测是否已完成                  |
| `backgroundColor` | `string \| undefined` | `#rrggbb` 格式的背景颜色        |
| `terminalName`    | `string \| undefined` | 终端名称/版本字符串             |
| `kittyProtocol`   | `boolean`             | Kitty 键盘协议支持              |
| `modifyOtherKeys` | `boolean`             | modifyOtherKeys（级别 ≥ 2）支持 |

#### 示例

```tsx
function MyComponent() {
  const { isReady, backgroundColor, kittyProtocol, modifyOtherKeys } =
    useTermcap();

  if (!isReady) {
    return <Text>加载中...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>背景色：{backgroundColor ?? "未知"}</Text>
      <Text>增强键盘：{kittyProtocol || modifyOtherKeys ? "✓" : "✗"}</Text>
    </Box>
  );
}
```

### `detectTermcap()`

用于直接终端能力检测的底层函数。

```typescript
function detectTermcap(
  stdin?: ReadStream,
  stdout?: WriteStream,
  timeout?: number,
): Promise<TermcapInfo>;
```

#### 参数

| 参数      | 类型          | 描述                            |
| --------- | ------------- | ------------------------------- |
| `stdin`   | `ReadStream`  | 输入流（例如 `process.stdin`）  |
| `stdout`  | `WriteStream` | 输出流（例如 `process.stdout`） |
| `timeout` | `number`      | 检测超时时间（毫秒）            |

#### 示例

```typescript
import { detectTermcap } from "tinky-termcap";

const caps = await detectTermcap(process.stdin, process.stdout, 1000);
```

### 终端特性

该库为高级用例导出特性定义：

```typescript
import {
  KittyFeature,
  Osc11Feature,
  TerminalNameFeature,
  DeviceAttributesFeature,
  ModifyOtherKeysFeature,
  type TermFeature,
} from "tinky-termcap/utils/term-features";

// 每个特性包含：
// - query：要发送的 ANSI 转义序列
// - responseRegex：匹配响应的模式

// 示例：自定义检测
process.stdout.write(KittyFeature.query);
// 监听匹配 KittyFeature.responseRegex 的响应
```

## 工作原理

1. **挂载时**：`TermcapProvider` 启用原始模式并发送检测查询
2. **查询序列**：为每个特性发送转义序列：
   - Kitty 键盘协议查询
   - OSC 11（背景颜色）
   - XTVERSION（终端名称）
   - modifyOtherKeys 查询
   - Device Attributes（哨兵）
3. **响应解析**：在响应到达时解析终端响应
4. **完成**：检测在以下情况完成：
   - 收到 Device Attributes 响应（表示所有响应已发送）
   - 超时到达

## 已测试终端

已测试：

- **xterm** - 完整支持 OSC 11 和 XTVERSION
- **kitty** - Kitty 协议、XTVERSION、OSC 11
- **WezTerm** - 完整特性支持
- **iTerm2** - OSC 11、XTVERSION
- **Alacritty** - OSC 11
- **macOS 终端** - 基本支持
- **VS Code 终端** - OSC 11

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
bun test

# 生成文档
npm run docs
```

## 许可证

Apache-2.0

详见 [LICENSE](./LICENSE)。
