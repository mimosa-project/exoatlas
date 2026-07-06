# ExoAtlas フロントエンド設計仕様書

## 1. 目的

本書は、ExoAtlas の React + TypeScript + Vite フロントエンドを実装するための設計仕様を定義する。

フロントエンドは FastAPI が提供する API から惑星データ、集計データ、チャート用データを取得し、検索、フィルタリング、チャート、天球マップ、惑星詳細パネルを通じて系外惑星データを探索できる UI を提供する。

## 2. スコープ

### 2.1 MVP 対象

- React + TypeScript + Vite の最小構成
- API クライアント
- ダッシュボード画面
- 惑星一覧テーブル
- フィルター UI
- 発見タイムラインチャート
- 惑星半径/質量と公転周期の散布図
- 天球マップ
- 惑星詳細ドロワー
- ローディング、空状態、エラー状態
- Vitest によるユーティリティと主要コンポーネントの最小テスト

### 2.2 MVP 対象外

- ユーザー認証
- お気に入り保存
- PNG / CSV エクスポート
- 3D 星図表示
- ルート分割された詳細ページ
- オフラインキャッシュ

## 3. 技術スタック

- React
- TypeScript
- Vite
- Plotly.js または Apache ECharts
- ESLint
- Vitest

チャートライブラリは MVP では Plotly.js を第一候補とする。既存 Streamlit 試作で Plotly を使用しており、散布図のホバー、対数軸、天球マップ表現へ移行しやすいためである。

## 4. 推奨ディレクトリ構成

```text
frontend/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    api/
      client.ts
      planets.ts
      discoveries.ts
      charts.ts
    components/
      filters/
        FilterPanel.tsx
        RangeField.tsx
        MethodSelect.tsx
      layout/
        AppShell.tsx
        Header.tsx
      planets/
        PlanetTable.tsx
        PlanetDetailDrawer.tsx
        MetricValue.tsx
      charts/
        DiscoveryTimeline.tsx
        OrbitScatterPlot.tsx
        SkyMap.tsx
      ui/
        EmptyState.tsx
        ErrorMessage.tsx
        LoadingState.tsx
    hooks/
      useDebouncedValue.ts
      usePlanetFilters.ts
    pages/
      DashboardPage.tsx
    types/
      api.ts
      filters.ts
    utils/
      format.ts
      query.ts
    styles/
      global.css
```

MVP では単一ページのダッシュボードとして実装し、後からルーティングを追加できる構成にする。

## 5. 画面設計

### 5.1 全体構成

最初の画面はアプリ本体のダッシュボードとし、マーケティング用ランディングページは作らない。

推奨レイアウト:

```text
+----------------------------------------------------------+
| Header: ExoAtlas / status / dataset summary              |
+----------------------+-----------------------------------+
| Filter Panel         | KPI row                           |
|                      +-----------------------------------+
| - Search             | Discovery Timeline                |
| - Discovery method   +-----------------------------------+
| - Discovery year     | Orbit Scatter Plot                |
| - Radius             +-----------------------------------+
| - Mass               | Sky Map + Planet Table            |
| - Orbital period     |                                   |
| - Habitable toggle   |                                   |
+----------------------+-----------------------------------+
| Planet Detail Drawer                                     |
+----------------------------------------------------------+
```

デスクトップでは左にフィルター、右にチャートと一覧を配置する。モバイルではフィルターを折りたたみ可能なパネルにし、チャートと一覧を縦積みにする。

### 5.2 ダッシュボード

ダッシュボードは以下を表示する。

- 総惑星数
- 表示中の惑星数
- 主な発見手法数
- 発見年範囲
- 発見タイムライン
- 公転周期と半径/質量の散布図
- 天球マップ
- 惑星一覧テーブル

KPI は API の一覧件数や発見手法 API から計算する。専用サマリー API は MVP では必須にしない。

### 5.3 惑星一覧

テーブル列:

| 表示名 | API フィールド |
| --- | --- |
| Planet | `planet_name` |
| Host | `host_name` |
| Method | `discovery_method` |
| Year | `discovery_year` |
| Period | `orbital_period_days` |
| Radius | `radius_earth` |
| Mass | `mass_earth` |
| Distance | `distance_parsec` |

行クリックで詳細ドロワーを開く。ページングは `limit` と `offset` を API に渡す。初期表示は `limit=50` とする。

### 5.4 惑星詳細ドロワー

詳細ドロワーは以下のセクションを持つ。

- 基本情報
  - 惑星名
  - 母星名
  - 発見年
  - 発見手法
- 惑星
  - 半径
  - 質量
  - 密度
  - 平衡温度
- 軌道
  - 公転周期
  - 軌道長半径
- 恒星
  - 恒星温度
  - 恒星半径
  - 恒星質量
  - スペクトル型
- 位置
  - 赤経
  - 赤緯
  - 距離

`null` は空文字や `0` ではなく、控えめな表示で `Not available` とする。

## 6. 状態設計

### 6.1 グローバル相当の画面状態

MVP では React の `useState` / `useReducer` とカスタムフックで管理する。Redux などの状態管理ライブラリは導入しない。

```ts
export type PlanetFilters = {
  q: string;
  discoveryMethod: string | null;
  discoveryYearMin: number | null;
  discoveryYearMax: number | null;
  radiusMin: number | null;
  radiusMax: number | null;
  massMin: number | null;
  massMax: number | null;
  orbitalPeriodMin: number | null;
  orbitalPeriodMax: number | null;
  habitableCandidate: boolean;
};
```

### 6.2 派生状態

- API クエリパラメータ
- 表示中ページ
- 選択中惑星名
- 詳細ドロワー開閉状態
- 散布図 Y 軸選択: `radius` または `mass`
- チャートの対数軸設定

### 6.3 URL 同期

MVP では URL クエリとの完全同期は必須にしない。ただし `utils/query.ts` に変換処理を分離し、後から URL 同期へ拡張しやすくする。

## 7. API クライアント設計

### 7.1 設定

API ベース URL は環境変数で指定する。

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

未指定時は同一オリジンまたは `http://127.0.0.1:8000` を開発既定値とする。

### 7.2 型定義

`types/api.ts` にバックエンドレスポンスと同じ形の型を定義する。

```ts
export type PlanetListItem = {
  id: number;
  planet_name: string;
  host_name: string;
  discovery_method: string | null;
  discovery_year: number | null;
  orbital_period_days: number | null;
  radius_earth: number | null;
  mass_earth: number | null;
  distance_parsec: number | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
```

API レスポンスの snake_case は、MVP ではそのまま TypeScript 型にも保持する。変換レイヤーを増やさず、バックエンド契約との対応を明確にするためである。

### 7.3 データ取得

MVP では `fetch` とカスタムフックで実装する。React Query などは、再取得・キャッシュ・エラー制御が複雑になった段階で導入を検討する。

API 関数例:

- `getPlanets(filters, pagination, sort)`
- `getPlanetDetail(planetName)`
- `getDiscoveryTimeline(filters)`
- `getDiscoveryMethods()`
- `getOrbitScatter(filters, yAxis)`
- `getSkyMap(filters)`

### 7.4 エラー処理

- HTTP `4xx` / `5xx` は `ApiError` として扱う。
- 画面上では各パネル単位でエラー表示する。
- API 全体が落ちている場合は、ヘッダーまたはページ上部に接続エラーを表示する。

## 8. コンポーネント設計

### 8.1 `AppShell`

アプリ全体のレイアウトを担当する。

- ヘッダー
- フィルター領域
- メインコンテンツ領域
- 詳細ドロワー配置

### 8.2 `FilterPanel`

検索と絞り込み条件を編集する。

入力要素:

- 検索ボックス
- 発見手法セレクト
- 発見年範囲
- 半径範囲
- 質量範囲
- 公転周期範囲
- 簡易ハビタブル候補トグル
- リセットボタン

検索文字列は `useDebouncedValue` で 300ms 程度遅延させ、入力のたびに過剰な API リクエストを送らない。

### 8.3 `DiscoveryTimeline`

`GET /api/discoveries/timeline` の結果を積み上げ棒グラフとして表示する。

- X 軸: `year`
- Y 軸: `count`
- 色: `discovery_method`

棒をクリックした場合、該当年を `discoveryYearMin` / `discoveryYearMax` に反映する。

### 8.4 `OrbitScatterPlot`

`GET /api/scatter/orbit-radius` の結果を散布図として表示する。

- X 軸: `orbital_period_days`
- Y 軸: `radius_earth` または `mass_earth`
- 色: `discovery_method`
- ホバー: 惑星名、母星名、発見年、半径、質量、公転周期

点をクリックした場合、該当惑星の詳細ドロワーを開く。

### 8.5 `SkyMap`

`GET /api/sky-map` の結果を赤経・赤緯の分布として表示する。

- X 軸: `right_ascension`
- Y 軸: `declination`
- 色: `discovery_method`
- 点サイズまたは透明度: 距離や重なりを考慮して調整

初期実装は 2D 散布図でよい。全天図らしい投影表現は MVP 後に改善する。

### 8.6 `PlanetTable`

`GET /api/planets` の結果を表示する。

- ページング
- ソート
- 行選択
- 空状態
- ローディング状態

数値は `utils/format.ts` で単位付き表示に変換する。

### 8.7 `PlanetDetailDrawer`

選択中の `planet_name` を受け取り、`GET /api/planets/{planet_name}` から詳細を取得する。

- 開いたタイミングで詳細を取得する。
- 閉じたときに選択状態を解除する。
- 詳細取得エラー時はドロワー内にエラーを表示する。

## 9. 表示・フォーマット方針

### 9.1 数値

| 値 | 表示例 |
| --- | --- |
| 公転周期 | `326.03 d` |
| 半径 | `12.10 R_Earth` |
| 質量 | `6,165.60 M_Earth` |
| 距離 | `93.18 pc` |
| 温度 | `4,742 K` |
| 軌道長半径 | `1.29 AU` |

画面表示では長すぎる小数を避け、`Intl.NumberFormat` を使う。

### 9.2 欠損値

`null` は `Not available` と表示する。テーブルでは視認性を優先し、短く `-` を使ってもよい。ただし内部状態では必ず `null` として扱う。

### 9.3 色とテーマ

- データ分析ツールとしての可読性を優先する。
- 暗色テーマを基本候補とする。
- チャートの系列色は発見手法ごとに一貫させる。
- 色だけに依存せず、凡例とホバー情報で意味が分かるようにする。

## 10. レスポンシブ設計

### 10.1 デスクトップ

- 左サイドバーにフィルターを固定表示する。
- メイン領域はチャートと一覧を縦に配置する。
- 詳細は右ドロワーとして表示する。

### 10.2 タブレット・モバイル

- フィルターは折りたたみパネルにする。
- チャートは横スクロールではなく幅に応じて再描画する。
- テーブルは重要列を優先し、横幅が足りない場合は列数を絞るか横スクロールを許容する。
- 詳細ドロワーは画面下からのパネルまたは全幅モーダルにする。

## 11. アクセシビリティ

- ボタン、入力、セレクトにラベルを付ける。
- チャートだけでなくテーブルでも主要データを確認できるようにする。
- ローディング状態をテキストでも示す。
- エラー状態を色だけで表現しない。
- キーボード操作で詳細ドロワーを開閉できるようにする。

## 12. パフォーマンス方針

- 一覧 API はページングで取得する。
- 検索入力は debounce する。
- チャート API は軽量データのみを取得する。
- チャートコンポーネントはフィルター変更時のみ再描画する。
- 大量点描画で重くなる場合は、API 側で件数制限やサンプリングを検討する。

## 13. テスト方針

### 13.1 ユーティリティ

- API クエリ生成
- 数値フォーマット
- `null` 表示フォーマット

### 13.2 コンポーネント

- `FilterPanel` の入力変更がフィルター状態に反映される
- `PlanetTable` が空状態、ローディング状態、データあり状態を表示する
- `PlanetDetailDrawer` が選択惑星名で詳細取得を開始する
- チャートコンポーネントが空データ時に落ちない

### 13.3 結合観点

- 初期表示で API が呼ばれる
- 検索条件変更で一覧とチャートが更新される
- 散布図またはテーブルから詳細ドロワーを開ける

## 14. 実装順序

1. Vite + React + TypeScript の最小構成を作る。　-> 済
2. API ベース URL と `fetch` クライアントを作る。　-> 済
3. 型定義を作る。　-> 済
4. `GET /health` または `GET /api/planets` への接続確認を行う。　-> 済
5. `AppShell` と `DashboardPage` を作る。　-> 済
6. `FilterPanel` とフィルター状態管理を作る。
7. `PlanetTable` を実装する。
8. `PlanetDetailDrawer` を実装する。
9. `DiscoveryTimeline` を実装する。
10. `OrbitScatterPlot` を実装する。
11. `SkyMap` を実装する。
12. ローディング、空状態、エラー状態を整える。
13. Vitest で主要ユーティリティとコンポーネントを検証する。

## 15. バックエンドとの契約

フロントエンドは以下の API 契約を前提にする。

- 一覧 API は `items`, `total`, `limit`, `offset` を返す。
- 欠損値は `null` として返る。
- API フィールド名は snake_case で受け取る。
- 惑星詳細の識別子は `planet_name` を URL エンコードして使う。
- フィルター名と意味はバックエンド仕様に合わせる。

API 契約を変更する場合は、`docs/backend-design.md` と本書の両方を更新する。
