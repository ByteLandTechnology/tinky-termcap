# tinky-termcap

[Tinky](https://github.com/ByteLandTechnology/tinky) アプリケーション向けのターミナル機能検出ライブラリ。背景色、Kitty キーボードプロトコル対応、modifyOtherKeys モードなどのターミナル機能を検出するための React フックとユーティリティを提供します。

## 機能

- 🎨 **背景色検出** - OSC 11 経由でターミナルテーマ（ライト/ダーク）を検出
- 📝 **ターミナル識別** - ターミナル名とバージョンを取得（xterm、kitty、WezTerm など）
- ⌨️ **Kitty キーボードプロトコル** - 拡張キーボード入力対応を検出
- 🔧 **modifyOtherKeys** - キーシーケンスの区別を検出（Ctrl+I と Tab）
- ⚛️ **React 統合** - Tinky アプリ向けのシームレスなフックとコンテキストプロバイダー

## 謝辞

このプロジェクトは [gemini-cli](https://github.com/google-gemini/gemini-cli) のターミナル機能検出実装に基づいています。

## インストール

```bash
npm install tinky-termcap
```

**ピア依存関係：**

- `tinky` >= 1.0.0

## クイックスタート

### Provider と Hook の使用

アプリケーションを `TermcapProvider` でラップし、`useTermcap` フックでターミナル機能にアクセスします。

```tsx
import { render, Box, Text } from "tinky";
import { TermcapProvider, useTermcap } from "tinky-termcap";

function App() {
  const { isReady, backgroundColor, terminalName, kittyProtocol } =
    useTermcap();

  if (!isReady) {
    return <Text>ターミナル機能を検出中...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>ターミナル：{terminalName ?? "不明"}</Text>
      <Text>背景色：{backgroundColor ?? "不明"}</Text>
      <Text>Kitty プロトコル：{kittyProtocol ? "対応" : "非対応"}</Text>
    </Box>
  );
}

render(
  <TermcapProvider>
    <App />
  </TermcapProvider>,
);
```

### ターミナルテーマへの適応

```tsx
import { useTermcap } from "tinky-termcap";
import { useMemo } from "react";

function ThemedComponent() {
  const { backgroundColor } = useTermcap();

  const isDarkTheme = useMemo(() => {
    if (!backgroundColor) return true; // 不明な場合はダークと仮定

    const hex = backgroundColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance < 0.5;
  }, [backgroundColor]);

  return (
    <Box borderStyle="round" borderColor={isDarkTheme ? "white" : "black"}>
      <Text color={isDarkTheme ? "cyan" : "blue"}>アダプティブコンテンツ</Text>
    </Box>
  );
}
```

### 直接使用（React なし）

```typescript
import { detectTermcap } from "tinky-termcap";

async function main() {
  // ターミナル応答を読み取るために raw モードを有効化
  process.stdin.setRawMode(true);

  const caps = await detectTermcap(process.stdin, process.stdout, 1000);

  console.log("検出完了：");
  console.log("  ターミナル：", caps.terminalName ?? "不明");
  console.log("  背景色：", caps.backgroundColor ?? "不明");
  console.log("  Kitty プロトコル：", caps.kittyProtocol ? "はい" : "いいえ");
  console.log("  modifyOtherKeys：", caps.modifyOtherKeys ? "はい" : "いいえ");

  process.stdin.setRawMode(false);
  process.exit(0);
}

main();
```

## API リファレンス

### `TermcapProvider`

ターミナル機能検出を実行する React コンテキストプロバイダー。

#### Props

| Prop                  | 型                | デフォルト | 説明                                             |
| --------------------- | ----------------- | ---------- | ------------------------------------------------ |
| `children`            | `React.ReactNode` | -          | 子コンポーネント                                 |
| `timeout`             | `number`          | `1000`     | 検出タイムアウト（ミリ秒）                       |
| `initialCapabilities` | `TermcapInfo`     | -          | 検出をスキップして提供された値を使用（テスト用） |

#### カスタムタイムアウトの例

```tsx
<TermcapProvider timeout={500}>
  <App />
</TermcapProvider>
```

#### テスト用の例

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

ターミナル機能にアクセスする React フック。`TermcapProvider` 内で使用する必要があります。

#### 戻り値：`TermcapInfo`

| プロパティ        | 型                    | 説明                              |
| ----------------- | --------------------- | --------------------------------- |
| `isReady`         | `boolean`             | 検出が完了したかどうか            |
| `backgroundColor` | `string \| undefined` | `#rrggbb` 形式の背景色            |
| `terminalName`    | `string \| undefined` | ターミナル名/バージョン文字列     |
| `kittyProtocol`   | `boolean`             | Kitty キーボードプロトコル対応    |
| `modifyOtherKeys` | `boolean`             | modifyOtherKeys（レベル ≥ 2）対応 |

#### 例

```tsx
function MyComponent() {
  const { isReady, backgroundColor, kittyProtocol, modifyOtherKeys } =
    useTermcap();

  if (!isReady) {
    return <Text>読み込み中...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>背景色：{backgroundColor ?? "不明"}</Text>
      <Text>
        拡張キーボード：{kittyProtocol || modifyOtherKeys ? "✓" : "✗"}
      </Text>
    </Box>
  );
}
```

### `detectTermcap()`

直接ターミナル機能検出を行う低レベル関数。

```typescript
function detectTermcap(
  stdin?: ReadStream,
  stdout?: WriteStream,
  timeout?: number,
): Promise<TermcapInfo>;
```

#### パラメータ

| パラメータ | 型            | 説明                                   |
| ---------- | ------------- | -------------------------------------- |
| `stdin`    | `ReadStream`  | 入力ストリーム（例：`process.stdin`）  |
| `stdout`   | `WriteStream` | 出力ストリーム（例：`process.stdout`） |
| `timeout`  | `number`      | 検出タイムアウト（ミリ秒）             |

#### 例

```typescript
import { detectTermcap } from "tinky-termcap";

const caps = await detectTermcap(process.stdin, process.stdout, 1000);
```

### ターミナル機能

ライブラリは高度なユースケース向けに機能定義をエクスポートします：

```typescript
import {
  KittyFeature,
  Osc11Feature,
  TerminalNameFeature,
  DeviceAttributesFeature,
  ModifyOtherKeysFeature,
  type TermFeature,
} from "tinky-termcap/utils/term-features";

// 各機能には以下が含まれます：
// - query：送信する ANSI エスケープシーケンス
// - responseRegex：応答にマッチするパターン

// 例：カスタム検出
process.stdout.write(KittyFeature.query);
// KittyFeature.responseRegex にマッチする応答をリッスン
```

## 動作原理

1. **マウント時**：`TermcapProvider` が raw モードを有効にし、検出クエリを送信
2. **クエリシーケンス**：各機能のエスケープシーケンスを送信：
   - Kitty キーボードプロトコルクエリ
   - OSC 11（背景色）
   - XTVERSION（ターミナル名）
   - modifyOtherKeys クエリ
   - Device Attributes（センチネル）
3. **応答解析**：到着したターミナル応答を解析
4. **完了**：以下のいずれかで検出が完了：
   - Device Attributes 応答を受信（すべての応答が送信されたことを示す）
   - タイムアウト到達

## テスト済みターミナル

テスト済み：

- **xterm** - OSC 11 と XTVERSION を完全サポート
- **kitty** - Kitty プロトコル、XTVERSION、OSC 11
- **WezTerm** - 全機能サポート
- **iTerm2** - OSC 11、XTVERSION
- **Alacritty** - OSC 11
- **macOS Terminal** - 基本サポート
- **VS Code Terminal** - OSC 11

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# テストの実行
bun test

# ドキュメント生成
npm run docs
```

## ライセンス

Apache-2.0

詳細は [LICENSE](./LICENSE) を参照してください。
