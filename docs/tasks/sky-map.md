# タスク仕様: `SkyMap` を実装する（距離フィルターの追加を含む）

対応する実装順序: `docs/frontend-design.md` §14 手順 11「`SkyMap` を実装する。」

## 1. 目的・背景

`docs/frontend-design.md` §8.5 および `docs/requirements.md` §7.5 に定義された天球マップ（赤経・赤緯の分布）を実装する。`docs/requirements.md` §7.5 および Phase 3「天球マップ」を満たす。初期実装は 2D 散布図とし、全天図らしい投影表現は MVP 後に改善する（`docs/frontend-design.md` §8.5）。

あわせて、`docs/requirements.md` §7.2「半径、質量、公転周期、距離などで範囲フィルターできる」・§7.5「発見手法、発見年、距離で絞り込みできる」・Phase 3「距離・位置による絞り込み」に対し、フロントエンドに距離フィルターが存在しない不整合を解消する。

> 矛盾点と決定事項: `docs/requirements.md` は距離による絞り込みを求めているが、`docs/frontend-design.md` §6.1 `PlanetFilters`・§8.2 `FilterPanel` には距離が含まれていなかった。`docs/backend-design.md` §8.1 は `distance_min` / `distance_max` を一覧・タイムライン・散布図・天球マップの共通フィルターとしており、一覧・散布図・天球マップ API（§7.3・§7.7・§7.8）は既に受け付けている。ただしタイムライン API（§7.5）は設計書・実装とも距離を受け付けておらず、§8.1 と不整合である。ユーザー確認（2026-10-26）により、本タスクで共通フィルター（`PlanetFilters` / `FilterPanel`）に距離範囲を追加し、一覧・KPI のうち「Displayed」（`listQueryParams` 経由）・全チャートに適用する。全チャートへの適用を満たすため、距離に限り §8.1 に合わせてタイムライン API にも `distance_min` / `distance_max` を追加する（§3.6）。`docs/frontend-design.md` §6.1・§8.2・§7.3、`docs/backend-design.md` §7.5 を本仕様に合わせて更新する。

手順 9・10 で整備した `PlotlyChart` と `utils/chart.ts` の配色・凡例ラベルを再利用し、点クリックで手順 8 の `PlanetDetailDrawer` を開く（`docs/tasks/planet-detail-drawer.md` §2.2 で本手順に委ねた操作）。

## 2. スコープ

### 2.1 対象

- 距離フィルター
  - `types/filters.ts` の `PlanetFilters` に `distanceMin: number | null` / `distanceMax: number | null` を追加。
  - `utils/query.ts` の `DEFAULT_PLANET_FILTERS`・`toPlanetListQueryParams`・`toChartFilterQueryParams`・`hasActiveFilters` を距離に対応。
  - `FilterPanel` に距離の範囲入力（`RangeField`）を追加。
  - `docs/frontend-design.md` §6.1・§8.2 の更新（§7.3 の関数例 `getSkyMap(filters)` も既存規約に合わせ `getSkyMap(params)` と記す）。
  - バックエンド: `GET /api/discoveries/timeline` に `distance_min` / `distance_max` を追加（`routers/planets.py`・`services/planets.py`・pytest）、`docs/backend-design.md` §7.5 の更新。
- 天球マップ
  - `api/charts.ts` に `getSkyMap(params)` を追加。
  - `utils/chart.ts` に天球マップ用の純粋関数（トレース生成・レイアウト）を追加。
  - `components/charts/SkyMap.tsx`（新規）。
  - `DashboardPage.tsx` への組み込み（`Sky map` プレースホルダーの置き換え）。これにより未使用となる `DashboardPlaceholder` コンポーネントを削除する（未使用の宣言は `tsc -b` の `noUnusedLocals` でビルドエラーとなるため）。

### 2.2 対象外

- 全天図らしい投影（Aitoff / Mollweide 等）、`scattergeo` の使用（`docs/frontend-design.md` §8.5「MVP 後に改善」）。
- 距離に応じた点サイズの変化（本タスクでは重なり対策として透明度のみ調整する。§3.3 受け入れ基準12）。
- 観測バイアスが見える表示改善（`docs/requirements.md` Phase 3 の当該項目。MVP 後に扱う）。`docs/requirements.md` §7.5「観測領域の偏りが見える表現にする」の MVP 部分は、全点を赤経・赤緯平面に半透明（受け入れ基準12）で描画し密度の偏りが見えることで満たすものとする。
- 天球マップ上の範囲選択による位置フィルター。
- 距離フィルターによる「Total planets」「Discovery methods」「Discovery years」の KPI、`FilterPanel` の発見手法の選択肢、`GET /api/discovery-methods` への影響（これらはデータセット全体から算出したまま変更しない）。
- 位置（赤経・赤緯）による絞り込み UI（Phase 3「距離・位置による絞り込み」のうち位置は対象外とする。バックエンドにも該当パラメータが無い）。
- 暗色テーマ向けのチャート配色・高さ調整（手順 12）。
- `PlotlyChart` の変更。
- 未使用となる CSS（`.dashboard-panel--placeholder`・`.dashboard-panel__description`）の整理（手順 12 で扱う）。

## 3. 受け入れ基準

### 3.1 距離フィルター

1. `DEFAULT_PLANET_FILTERS` の `distanceMin` / `distanceMax` は `null`。
2. `toPlanetListQueryParams(filters)` は `distanceMin` が非 `null` なら `distance_min`、`distanceMax` が非 `null` なら `distance_max` を数値で含める。`null` の場合は含めない。`0` は値として含める。既存のキーの出力は変えない。
3. `toChartFilterQueryParams(filters)` も同様に `distance_min` / `distance_max` を含める（これにより `DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap` の取得にも距離フィルターが適用される。タイムラインは §3.6 のバックエンド変更により有効になる）。発見手法・発見年の出力は変えず、半径・質量・公転周期・検索文字列・ハビタブル候補は引き続き含めない。
4. `hasActiveFilters(filters)` は `distanceMin` または `distanceMax` が非 `null` の場合に `true` を返す。
5. `FilterPanel` は、公転周期の範囲入力の直後に、凡例（`legend`）`Distance (pc)` の範囲入力を表示する。入力欄は既存の範囲入力と同じく `Min` / `Max` のラベルを持ち、ID はそれぞれ `filter-distance-min` / `filter-distance-max`。`step` は `RangeField` の既定値（`'any'`）とする。
6. 距離の `Min` / `Max` 入力の変更で、それぞれ `onFilterChange('distanceMin', value)` / `onFilterChange('distanceMax', value)` を呼ぶ（値の変換は既存の `RangeField` の挙動に従う。空欄は `null`）。
7. `disabled` の場合、距離の入力欄も無効になる。リセットボタン（既存）により距離も `null` に戻る（`resetFilters` が `DEFAULT_PLANET_FILTERS` を使うため）。

### 3.2 `api/charts.ts`

8. `getSkyMap(params)` は `GET /api/sky-map` にクエリ文字列（`buildQueryString(params)`）を付けて呼び出し、`SkyMapResponse` を返す。引数省略時はクエリ文字列なしで呼び出す。

### 3.3 `utils/chart.ts` の追加関数

9. `buildSkyMapTraces(items: SkyMapItem[]): SkyMapTrace[]`（`SkyMapTrace` は `utils/chart.ts` から export する型）は、発見手法ごとに1つの散布図トレース（`type: 'scatter'`, `mode: 'markers'`）を返す。
   - `name` は `formatDiscoveryMethodLabel(discovery_method)`、`marker.color` は `getDiscoveryMethodColor(discovery_method)`。`discovery_method` が `null` の項目は `name: "Not available"` の1トレースにまとめる。
   - 各点の `x` は `right_ascension`、`y` は `declination`。
   - `right_ascension` または `declination` が `null` の項目は除外する。除外の結果、項目が無くなった手法のトレースは返さない。`distance_parsec` が `null` の項目は除外しない。
   - トレース内の点の順序は入力の順序を保つ。トレースの並び順は手法ごとの点数（除外後）の降順、同数の場合は `name` の昇順（`localeCompare`）。
   - 入力が空配列（または全件除外）の場合は空配列を返す。
10. 各トレースの `customdata` は点ごとの配列 `[planetName, hostName, discoveryYear, rightAscension, declination, distance]`（いずれも表示用文字列）とし、`x` と同じ並びとする。
    - `planetName` / `hostName` は文字列そのまま、`discoveryYear` は桁区切りなしの文字列。`null` の場合は `"Not available"`。
    - `rightAscension` / `declination` は `formatDegrees`、`distance` は `formatDistance`（既定の `"Not available"`）で整形した文字列。
11. 各トレースの `hovertemplate` は `%{customdata[0]}` から `%{customdata[5]}` までをすべて含み、手法名（トレースの `name`）をリテラルとして含み、末尾を `<extra></extra>` とする。惑星名・母星名はテンプレートに直接埋め込まない。
12. 各トレースの `marker.opacity` は `0.6`（点の重なりを見せるため）。
13. `buildSkyMapLayout()` は次を含む `Partial<Layout>` を返す。
    - `showlegend: true`、`hovermode: 'closest'`。
    - `xaxis: { title: { text: 'Right ascension (°)' }, range: [360, 0] }`（天球図の慣例に合わせ、赤経は右から左へ増加する）。
    - `yaxis: { title: { text: 'Declination (°)' }, range: [-90, 90] }`。
    - 呼び出しごとに内容が等しいオブジェクトを返す（参照の同一性はコンポーネント側で保証する。受け入れ基準19）。

### 3.4 `SkyMap`

Props:

```ts
type SkyMapProps = {
  queryParams: ChartFilterQueryParams  // usePlanetFilters().chartQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}
```

14. 見出し `Sky map` を持つ `section` を描画し、見出しによりアクセシブル名 `Sky map` を持つ。
15. `disabled` が `true` の場合、API を呼ばず、`role="status"` の要素に文言 `Waiting for API connection…` を表示し、`PlotlyChart` を描画しない。`disabled` が `true` から `false` に変わった時点で取得を開始する。`false` から `true` に変わった場合は待機表示に切り替え、取得中のリクエストの結果は破棄する。
16. `disabled` が `false` の場合、`getSkyMap(queryParams)` を呼ぶ。`queryParams` の参照が変わるたびに再取得する。
17. 取得中（初回・再取得とも）は `PlotlyChart`・空状態メッセージ・エラー表示を描画せず、`role="status"` の要素に文言 `Loading sky map…` を表示する。
18. 取得成功時、`buildSkyMapTraces(items)` の結果を `data` に、`buildSkyMapLayout()` の結果を `layout` に、`ariaLabel` に `"Sky map chart"` を渡して `PlotlyChart` を描画する。
19. `data` と `layout` は、取得結果が変わらない限り親の再レンダーで同じオブジェクトを渡す（`docs/frontend-design.md` §12）。
20. トレースが空配列の場合、`PlotlyChart` を描画せず、文言 `No planets match the current filters.` を表示する（`role` は付けない）。
21. 取得がエラーになった場合、`PlotlyChart` を描画せず、エラーメッセージを `role="alert"` で表示する（`ApiError` または `Error` の場合はその `message`、それ以外は `"Request failed"`）。後続の取得が開始された時点でエラー表示は受け入れ基準17のローディング表示に置き換わり、その取得も失敗した場合は新しいエラーメッセージを表示する。
22. 先行リクエストの結果（成功・失敗とも）が後から返っても、最新の `queryParams` の表示を上書きしない。
23. `PlotlyChart` の `onPointClick` で受け取った点の `customdata` が配列で、その先頭要素が空白以外の文字を含む文字列であり、かつ `"Not available"` ではない場合に限り、その文字列で `onSelectPlanet(planetName)` を1回呼ぶ。それ以外では呼ばない（`docs/tasks/orbit-scatter-plot.md` 受け入れ基準17 と同じ規則）。

### 3.5 `DashboardPage` との連携

24. `SkyMap` に `usePlanetFilters().chartQueryParams`、`disabled={connection.status !== 'connected'}`、`onSelectPlanet={setSelectedPlanetName}` を渡す。
### 3.6 バックエンド: タイムライン API の距離フィルター

25. `GET /api/discoveries/timeline` はクエリ `distance_min` / `distance_max`（number、省略可）を受け付け、`sy_dist`（`distance_parsec`）がその範囲（両端を含む）にある惑星のみを集計する。指定時、距離が欠損の惑星は集計から除外する（一覧・散布図・天球マップ API と同じ既存の範囲フィルター挙動）。距離条件は既存の `discovery_method` / `disc_year_min` / `disc_year_max` と AND で組み合わさり、`group_by_method` が `true` / `false` のいずれでも適用される。
26. `distance_min` / `distance_max` を省略した場合の結果は変更前と同一である（既存テストがすべて通過する）。
27. 数値として解釈できない `distance_min` 等（例: `far`）は FastAPI の検証により `422` を返す（他エンドポイントと同じ。`nan` / `inf` は float として受理される既存挙動のままとし、本タスクでは扱わない）。
28. ドキュメント更新: `docs/backend-design.md` §7.5 のクエリパラメータ表に `distance_min` / `distance_max` を追記する。`docs/frontend-design.md` §6.1 の `PlanetFilters` に `distanceMin` / `distanceMax`、§8.2 の入力要素に「距離範囲」を追記し、§7.3 の関数例のうちチャート系（`getDiscoveryTimeline(filters)`・`getOrbitScatter(filters, yAxis)`・`getSkyMap(filters)`）を実装に合わせて `getDiscoveryTimeline(params)`・`getOrbitScatter(params)`・`getSkyMap(params)` とする。
- バックエンド変更後、`.codex` に従い `uv run ruff check .` / `uv run pytest` / `uv build` を通過させる。

### 3.7 結合テストの扱い

- 注記: 受け入れ基準24 および距離フィルター変更による一覧・各チャートの再取得の結合テストは手順 13 で扱う。本タスクでは `utils/query.ts`・`FilterPanel`・`api/charts.ts`・`utils/chart.ts`・`SkyMap` の単体テスト、および手動確認とする。

## 4. 影響する API・データ契約

- `GET /api/sky-map`（`docs/backend-design.md` §7.8）。使用するクエリ: `discovery_method`, `disc_year_min`, `disc_year_max`, `distance_min`, `distance_max`。既存型 `SkyMapQueryParams` / `SkyMapResponse` / `SkyMapItem` を使用する。
- `GET /api/planets`・`/api/scatter/orbit-radius` にも `distance_min` / `distance_max` が送られるようになる（いずれもバックエンド契約に既存。既存型 `PlanetListQueryParams` / `ChartFilterQueryParams` にも定義済みのため、フロントエンドの API 型の変更は不要）。
- `GET /api/discoveries/timeline` に `distance_min` / `distance_max` を追加する（後方互換。§3.6）。`docs/backend-design.md` §7.5 のクエリパラメータ表に追記する。
- `PlanetFilters`（フロントエンド内部の状態型）に `distanceMin` / `distanceMax` を追加する。
- `docs/frontend-design.md` §6.1 の `PlanetFilters` 定義と §8.2 の入力要素一覧に距離を追記する。
- 新規依存なし。

## 5. エッジケース・異常系の扱い

- 距離の `Min` > `Max`: 既存の他の範囲入力と同様、フロントエンドでは検証せずそのまま送る。バックエンドは検証しないため結果は0件となり、各パネルは空状態を表示する。
- 距離に負値: 同様にそのまま送る（通常の範囲として扱われる）。
- 距離フィルター指定時、`distance_parsec` が `null` の惑星はバックエンドで除外される（バックエンドの既存挙動）。
- `right_ascension` / `declination` が `null`: 除外（受け入れ基準9。API 側でも除外される）。
- 赤経が `[0, 360]`、赤緯が `[-90, 90]` の範囲外: 契約上発生しないため対処しない（軸範囲外の点は表示されない）。
- `planet_name` が `null` の点のクリック: 何もしない（受け入れ基準23）。
- 空結果: 受け入れ基準20。
- テストでは `PlotlyChart` をモックする（手順 9・10 と同様）。

## 6. 未決事項

- なし。
