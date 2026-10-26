# タスク仕様: `DiscoveryTimeline` を実装する

対応する実装順序: `docs/frontend-design.md` §14 手順 9「`DiscoveryTimeline` を実装する。」

## 1. 目的・背景

`docs/frontend-design.md` §8.3 に定義された発見タイムライン（発見年 × 発見手法の積み上げ棒グラフ）を実装する。`docs/requirements.md` §13 の受け入れ基準「発見タイムラインが表示される」を満たす。

フロントエンドにはまだチャートライブラリが導入されていない。`docs/frontend-design.md` §3 で MVP の第一候補とされている Plotly.js を本タスクで導入し、手順 10・11（散布図・天球マップ）でも再利用できる共通基盤（Plotly ラッパーコンポーネントと発見手法の配色）を合わせて整備する。

> `docs/requirements.md` §14 未決事項「チャートライブラリを Plotly.js と Apache ECharts のどちらにするか」について、ユーザーからの手順 8〜13 の自律開発指示（2026-10-26）に基づき、本タスクで `docs/frontend-design.md` §3 の第一候補である Plotly.js を採用する（設計書と矛盾しない選択であり、要件定義書の未決事項を設計書側の既定方針で確定させるものである）。本タスク完了時に `docs/requirements.md` §14 の当該項目を「Plotly.js を採用（決定済み）」と更新する。

## 2. スコープ

### 2.1 対象

- 依存追加: `plotly.js-dist-min`（`3.7.0`）、型定義 `@types/plotly.js@3.0.15`（devDependencies）。npm 上の `@types/plotly.js-dist-min`（2.x 系）は v3 と合わないため導入せず、`src/types/plotly-dist-min.d.ts` に `declare module 'plotly.js-dist-min'` を置き、`plotly.js` の名前空間（`import * as Plotly from 'plotly.js'`）を **default export** として宣言する。
- `frontend/src/api/discoveries.ts` に `getDiscoveryTimeline(params)` を追加。
- `frontend/src/utils/chart.ts`（新規）: 発見手法の配色と、タイムライン用トレース生成の純粋関数。
- `frontend/src/components/charts/PlotlyChart.tsx`（新規）: Plotly を描画する薄いラッパー。手順 10・11 でも使用する。
- `frontend/src/components/charts/DiscoveryTimeline.tsx`（新規）。
- `DashboardPage.tsx` への組み込み（`Discovery timeline` プレースホルダーの置き換え）。
- `global.css` へのチャートパネル用スタイル追加。
- `docs/requirements.md` §14 のチャートライブラリ項目の更新。

### 2.2 対象外

- 散布図・天球マップ（手順 10・11）。
- グラフ画像の PNG エクスポート（`docs/frontend-design.md` §2.2。Plotly のモードバーは非表示にする）。
- 棒クリック以外のインタラクション（範囲選択による年範囲指定、凡例クリックによる手法フィルター連動など）。凡例クリックによる系列の表示切り替えは Plotly 標準動作のまま許容する。
- 年範囲フィルター適用後に「クリア」する専用 UI（既存の `FilterPanel` の年範囲入力・リセットボタンで解除できる）。
- `distance_min` / `distance_max` のフィルター UI（`FilterPanel` に存在しないため対象外）。

## 3. 受け入れ基準

### 3.1 `api/discoveries.ts`

1. `getDiscoveryTimeline(params)` は `GET /api/discoveries/timeline` にクエリ文字列（`buildQueryString(params)`）を付けて呼び出し、`DiscoveryTimelineResponse` を返す。引数省略時はクエリ文字列なしで呼び出す。

### 3.2 `utils/chart.ts`

2. `getDiscoveryMethodColor(method: string | null): string` は、データセットに存在する11手法（Transit, Radial Velocity, Microlensing, Imaging, Transit Timing Variations, Eclipse Timing Variations, Orbital Brightness Modulation, Pulsar Timing, Astrometry, Pulsation Timing Variations, Disk Kinematics）それぞれに対し、互いに異なる固定の色（`#rrggbb` 形式）を返す。同じ入力には常に同じ色を返す。
3. 上記11手法以外の文字列、および `null` に対しては、共通のフォールバック色（11手法のいずれとも異なる `#rrggbb`）を返す。
4. `formatDiscoveryMethodLabel(method: string | null): string` は、非 `null` ならその文字列を、`null` なら `"Not available"` を返す（`docs/requirements.md` §「欠損値は Unknown ではなく未取得として扱う」）。
5. `buildTimelineTraces(items: DiscoveryTimelineItem[])` は、発見手法ごとに1つの棒グラフトレース（`type: 'bar'`）を返す。
   - 各トレースの `name` は `formatDiscoveryMethodLabel(discovery_method)`、`marker.color` は `getDiscoveryMethodColor(discovery_method)`。
   - 各トレースの `x` は年（昇順）、`y` は対応する `count`。同じ年・手法の組が複数ある場合は `count` を合算する。
   - `year` が `null` の項目は除外する。除外の結果、項目が無くなった手法のトレースは返さない。
   - トレースの並び順は、手法ごとの `count` 合計の降順。合計が同じ場合は `name` の昇順（`localeCompare`）。
   - `discovery_method` が `null` の項目は `name: "Not available"` の1トレースにまとめる。
   - 入力が空配列の場合は空配列を返す。
6. 各トレースの `customdata` は `x` と同じ並びの年の配列とし、`hovertemplate` は `%{x}`、`%{y}` を含み、手法名（トレースの `name` と同じ文字列）をリテラルとして埋め込む、末尾を `<extra></extra>` とする（トレース名の重複表示を抑止する）。

### 3.3 `PlotlyChart`

Props:

```ts
type PlotlyChartProps = {
  data: Data[]          // plotly.js の Data
  layout: Partial<Layout>
  ariaLabel: string
  onPointClick?: (point: PlotlyPointClick) => void
}
type PlotlyPointClick = {
  x: unknown
  y: unknown
  customdata: unknown
  curveNumber: number
  pointIndex: number
}
```

7. ラッパー要素（`div`）に `role="img"` と `aria-label={ariaLabel}` を付与する。
8. マウント後に `plotly.js-dist-min` を動的 import し、`Plotly.react(element, data, layout, config)` を呼ぶ。`plotly.js-dist-min` は UMD バンドルであるため、モジュールは `mod.default ?? mod` で解決する（`default` があればそれを、無ければ名前空間オブジェクトをそのまま Plotly として使う）。動的 import はマウント中に1回だけ行い（モジュールレベルでの Promise キャッシュも可）、`data` / `layout` の変更ごとに import し直さない。テストのモックは `default: { react, purge }` の形で提供する。`config` は `{ responsive: true, displayModeBar: false }` を含む。
9. `data` または `layout` の**参照**が変わると、同じ要素に対して `Plotly.react` を再度呼ぶ。同じ `data` / `layout` オブジェクトのまま再レンダーされた場合は `Plotly.react` を呼ばない。動的 import の完了前に `data` / `layout` が変わった場合は、import 完了後に最新の `data` / `layout` で `Plotly.react` を1回だけ呼ぶ。
10. 最初に成功（resolve）した `Plotly.react` の完了後に、対象要素（Plotly が拡張したグラフ要素）の `on('plotly_click', handler)` でクリックハンドラを1つだけ登録する。2回目以降の `Plotly.react` 後に重複登録しない（1回のクリックイベントでコールバックが2回以上呼ばれない）。ハンドラは、イベントの `points` の最初の点について `onPointClick` を `{ x, y, customdata, curveNumber, pointIndex }` で1回呼ぶ。`onPointClick` 未指定時はエラーにならない。`points` が無い・空の場合は呼ばない。
11. `onPointClick` の参照が差し替わった場合、以後のクリックでは最新のコールバックを呼ぶ。差し替えだけでは `Plotly.react` を再度呼ばない。
12. アンマウント時に `Plotly.purge(element)` を呼ぶ。動的 import の完了前にアンマウントされた場合は `Plotly.react` を呼ばない。動的 import が失敗した場合は例外を握りつぶし、未処理の Promise rejection を発生させない（チャート領域は空のままとなる）。 `Plotly.react` が返す Promise が reject した場合も同様に握りつぶす。`Plotly.react` の呼び出し後、その Promise の解決前にアンマウントされた場合は、クリックハンドラを登録せず、`Plotly.purge(element)` はアンマウント時に必ず呼ぶ。

### 3.4 `DiscoveryTimeline`

Props:

```ts
type DiscoveryTimelineProps = {
  queryParams: ChartFilterQueryParams  // usePlanetFilters().chartQueryParams
  disabled?: boolean
  onSelectYear: (year: number) => void
}
```

13. 見出し `Discovery timeline` を持つ `section` を描画する（`aria-label` または見出しでアクセシブル名 `Discovery timeline` を持つ）。
14. `disabled` が `true` の場合、API を呼ばず、`role="status"` の要素に文言 `Waiting for API connection…` を表示し、`PlotlyChart` を描画しない。`disabled` が `true` から `false` に変わった時点で取得を開始する（受け入れ基準15）。
15. `disabled` が `false` の場合、`getDiscoveryTimeline({ ...queryParams, group_by_method: true })` を呼ぶ。`queryParams` の参照が変わるたびに再取得する（`chartQueryParams` は検索文字列など timeline に無関係なフィルター変更でも参照が変わるため、内容が同じでも再取得されることを許容する）。
16. 取得中（初回・再取得とも）は `PlotlyChart` を描画せず、`role="status"` の要素に文言 `Loading discovery timeline…` のみを表示する（再取得のたびに `PlotlyChart` がアンマウントされ再生成されるが、MVP として許容する。手順 12 で再検討する）。
17. 取得結果から `buildTimelineTraces` で生成したトレースを `PlotlyChart` に渡す。`layout` は `barmode: 'stack'`、`showlegend: true`（系列が1つの場合も凡例を表示し、色だけに依存しない。`docs/frontend-design.md` §9.3・§11）、`xaxis: { title: { text: 'Discovery year' }, tickformat: 'd' }`、`yaxis: { title: { text: 'Planets' } }` を含む（Plotly v3 では `title` の文字列形式は使用できない）。`traces` と `layout` は `useMemo` 等で保持し、取得結果が変わらない限り親の再レンダーで同じオブジェクトを `PlotlyChart` に渡す（`docs/frontend-design.md` §12「チャートコンポーネントはフィルター変更時のみ再描画する」）。ダークテーマ向けの配色・チャート高さの調整は手順 12 で扱う。`ariaLabel` は `"Discovery timeline chart"`。
18. `buildTimelineTraces` の結果が空配列の場合、`PlotlyChart` を描画せず、文言 `No discoveries match the current filters.` を表示する（`role` は付けない）。
19. 取得がエラーになった場合、`PlotlyChart` を描画せず、エラーメッセージを `role="alert"` で表示する（`ApiError` または `Error` の場合はその `message`、それ以外の値の場合は `"Request failed"`。既存 `PlanetTable` と同じ規約）。 後続の取得が開始された時点でエラー表示は受け入れ基準16のローディング表示に置き換わり、その取得も失敗した場合は新しいエラーメッセージを表示する。
20. `PlotlyChart` の `onPointClick` で受け取った点の `customdata`（`undefined`/`null` のときは `x`）が、number 型または空白以外の文字を含む文字列であり、かつ `Number(value)` が `Number.isInteger` を満たす場合に限り、その数値で `onSelectYear(year)` を1回呼ぶ。それ以外（空文字・空白のみ、小数、`NaN`、`Infinity`、配列など）では呼ばない。
21. 先行リクエストの結果が後から返っても、最新の `queryParams` の表示を上書きしない。

### 3.5 `DashboardPage` との連携

22. `DiscoveryTimeline` に `usePlanetFilters().chartQueryParams` と `disabled={connection.status !== 'connected'}` を渡す。
23. `onSelectYear(year)` で `discoveryYearMin` と `discoveryYearMax` の両方を `year` に設定する（`docs/frontend-design.md` §8.3）。これにより `FilterPanel` の年範囲入力、一覧、KPI の表示中件数、タイムライン自体が当該年で絞り込まれる。
- 注記: 受け入れ基準22・23 の `DashboardPage` 結合の自動テストは手順 13 で扱う。本タスクでは `api/discoveries.ts`・`utils/chart.ts`・`PlotlyChart`・`DiscoveryTimeline` の単体テスト、および手動確認とする。

## 4. 影響する API・データ契約

- `GET /api/discoveries/timeline`（`docs/backend-design.md` §7.5）。使用するクエリ: `discovery_method`, `disc_year_min`, `disc_year_max`, `group_by_method=true`。既存型 `DiscoveryTimelineQueryParams` / `DiscoveryTimelineResponse` を使用し、型・契約の変更はしない。
- `chartQueryParams` は既存の `toChartFilterQueryParams` が生成する（発見手法・発見年のみ。検索文字列・半径などは timeline API の契約に無いため渡さない）。
- 新規依存: `plotly.js-dist-min@3.7.0`、`@types/plotly.js@3.0.15`（dev）。いずれも完全一致のバージョン指定とする。最新の Plotly 4.x ではなく 3.x を採用するのは、型定義 `@types/plotly.js` が 3.x までしか対応していないためである。

## 5. エッジケース・異常系の扱い

- 空結果（フィルターで0件）: 受け入れ基準18。
- `year` が `null` の行: 除外（受け入れ基準5）。全行が `null` 年なら空状態。
- `discovery_method` が `null`: `"Not available"` 系列として表示（受け入れ基準5）。
- 年が1つだけ: 1本の積み上げ棒として表示される（特別扱いしない）。
- jsdom など Plotly が描画できない環境: コンポーネントテストでは `PlotlyChart` をモックする。`PlotlyChart` 自体のテストでは `plotly.js-dist-min` をモックし、モックの `react` が要素に `on` / `removeAllListeners` 相当を生やしてテストからクリックイベントを発火できるようにする。
- Plotly の動的 import 失敗: 本タスクでは個別のエラー表示は行わない（チャート領域が空のままになる。受け入れ基準12）。手順 12 で状態表示を整える際に再検討する。
- バンドルサイズ: Plotly は動的 import により別チャンクとし、初期チャンクに含めない。`npm run build` の出力で Plotly が初期チャンクと別のチャンクになっていること、および実ブラウザ（`npm run dev` + バックエンド）でタイムラインが描画されることを手動確認する。

## 6. 未決事項

- なし。
