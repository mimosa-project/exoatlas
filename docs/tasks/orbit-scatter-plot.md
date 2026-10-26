# タスク仕様: `OrbitScatterPlot` を実装する

対応する実装順序: `docs/frontend-design.md` §14 手順 10「`OrbitScatterPlot` を実装する。」

## 1. 目的・背景

`docs/frontend-design.md` §8.4 および `docs/requirements.md` §7.4 に定義された「惑星サイズ・軌道散布図」（公転周期 × 半径または質量）を実装する。`docs/requirements.md` §13 の受け入れ基準「惑星半径と公転周期の散布図が表示される」を満たす。

手順 9 で導入した `PlotlyChart`（`components/charts/PlotlyChart.tsx`）と発見手法の配色（`utils/chart.ts`）を再利用する。点クリックで手順 8 の `PlanetDetailDrawer` を開く（`docs/tasks/planet-detail-drawer.md` §2.2 で本手順に委ねた操作）。

## 2. スコープ

### 2.1 対象

- `frontend/src/api/charts.ts`（新規。`docs/frontend-design.md` §4 の構成に従う）に `getOrbitScatter(params)` を追加。
- `frontend/src/utils/chart.ts` に散布図用の純粋関数（トレース生成・レイアウト生成）を追加。
- `frontend/src/components/charts/OrbitScatterPlot.tsx`（新規）。Y 軸切り替え（半径／質量）と対数軸切り替えの UI を含む。
- `DashboardPage.tsx` への組み込み（`Orbit scatter plot` プレースホルダーの置き換え）。
- `global.css` への散布図コントロール用スタイル追加。

### 2.2 対象外

- 天球マップ（手順 11）。
- WebGL（`scattergl`）表示、サンプリング（`docs/requirements.md` §10.1「検討する」に留まる。現状のデータ件数は約5,500件で SVG 描画で足りるため、本タスクでは `scatter` を使う）。
- 範囲選択・ズーム結果をフィルターへ反映する操作。Plotly 標準のズーム／パン／凡例クリックによる系列の表示切り替えは許容する。
- Y 軸選択・対数軸設定の永続化や URL 同期（`docs/frontend-design.md` §6.3）。
- X 軸・Y 軸を個別に対数／線形切り替えする UI（両軸共通の1つの切り替えのみとする）。
- `PlotlyChart` の変更（手順 9 の仕様のまま再利用する）。
- 暗色テーマ向けのチャート配色・高さ調整（手順 12）。

## 3. 受け入れ基準

### 3.1 `api/charts.ts`

1. `getOrbitScatter(params)` は `GET /api/scatter/orbit-radius` にクエリ文字列（`buildQueryString(params)`）を付けて呼び出し、`ScatterOrbitRadiusResponse` を返す。引数省略時はクエリ文字列なしで呼び出す。

### 3.2 `utils/chart.ts` の追加関数

2. `buildOrbitScatterTraces(items: ScatterOrbitRadiusItem[], yAxis: ScatterYAxis): OrbitScatterTrace[]`（`OrbitScatterTrace` は `utils/chart.ts` から export する型）は、発見手法ごとに1つの散布図トレース（`type: 'scatter'`, `mode: 'markers'`）を返す。
   - 各トレースの `name` は `formatDiscoveryMethodLabel(discovery_method)`、`marker.color` は `getDiscoveryMethodColor(discovery_method)`。`discovery_method` が `null` の項目は `name: "Not available"` の1トレースにまとめる。
   - 各点の `x` は `orbital_period_days`、`y` は `yAxis` が `'radius'` なら `radius_earth`、`'mass'` なら `mass_earth`。
   - `x` または `y` が `null` の項目は除外する（API 側でも除外されるが、防御的に除外する）。除外の結果、項目が無くなった手法のトレースは返さない。
   - トレース内の点の順序は入力の順序を保つ。
   - トレースの並び順は、手法ごとの点数（`null` 除外後）の降順。点数が同じ場合は `name` の昇順（`localeCompare`）。
   - 入力が空配列（または全件除外）の場合は空配列を返す。
3. 各トレースの `customdata` は点ごとの配列 `[planetName, hostName, discoveryYear, radius, mass, orbitalPeriod]`（いずれも表示用文字列）とし、`x` と同じ並びとする。
   - `planetName` は `planet_name`、`hostName` は `host_name`、`discoveryYear` は `discovery_year` を桁区切りなしで文字列化したもの。`null` の場合はいずれも `"Not available"`。
   - `radius` / `mass` / `orbitalPeriod` は `formatRadius` / `formatMass` / `formatOrbitalPeriod`（既定の `"Not available"`）で整形した文字列。
4. 各トレースの `hovertemplate` は `%{customdata[0]}` から `%{customdata[5]}` までをすべて含み、末尾を `<extra></extra>` とする。手法名（トレースの `name`）をリテラルとして含む。
5. `buildOrbitScatterLayout(yAxis: ScatterYAxis, logScale: boolean)` は次を含む `Partial<Layout>` を返す。
   - `showlegend: true`、`hovermode: 'closest'`。
   - `xaxis: { title: { text: 'Orbital period (days)' }, type }`。
   - `yaxis: { title: { text }, type }`。`text` は `yAxis` が `'radius'` なら `'Radius (Earth radii)'`、`'mass'` なら `'Mass (Earth masses)'`。
   - `type` は `logScale` が `true` なら両軸とも `'log'`、`false` なら両軸とも `'linear'`。

### 3.3 `OrbitScatterPlot`

Props:

```ts
type OrbitScatterPlotProps = {
  queryParams: ChartFilterQueryParams  // usePlanetFilters().chartQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}
```

6. 見出し `Orbit scatter plot` を持つ `section` を描画し、見出しによりアクセシブル名 `Orbit scatter plot` を持つ。
7. Y 軸の選択 UI として、`fieldset`（`legend` は `Y axis`）内にラジオボタン `Radius`（値 `radius`）と `Mass`（値 `mass`）を表示する。初期選択は `Radius`。
8. 対数軸の切り替え UI として、ラベル `Log scale` のチェックボックスを表示する。初期状態はチェック済み（対数軸）。
9. `disabled` が `true` の場合、API を呼ばず、`role="status"` の要素に文言 `Waiting for API connection…` を表示し、`PlotlyChart` を描画しない。Y 軸ラジオボタンと `Log scale` チェックボックスは `disabled` にする。`disabled` が `true` から `false` に変わった時点で取得を開始する。
10. `disabled` が `false` の場合、`getOrbitScatter({ ...queryParams, y_axis })` を呼ぶ（`y_axis` は現在の Y 軸選択）。`queryParams` の参照が変わるたび、および Y 軸選択が変わるたびに再取得する。
11. `Log scale` の切り替えでは再取得しない。`PlotlyChart` に渡す `layout` のみを `buildOrbitScatterLayout(yAxis, logScale)` の結果に更新する。
12. 取得中（初回・再取得とも）は `PlotlyChart`・空状態メッセージ・エラー表示を描画せず、`role="status"` の要素に文言 `Loading orbit scatter plot…` を表示する。Y 軸ラジオボタンと `Log scale` チェックボックスは、取得中・空状態・エラー時も表示し操作可能とする（`disabled` 時を除く）。
13. 取得成功時、`buildOrbitScatterTraces(items, yAxis)` の結果を `data` に、`buildOrbitScatterLayout(yAxis, logScale)` の結果を `layout` に、`ariaLabel` に `"Orbit scatter plot chart"` を渡して `PlotlyChart` を描画する。`data` と `layout` の `yAxis` はいずれも取得時点の Y 軸選択とする（Y 軸変更時は受け入れ基準12によりローディング表示となるため、両者が食い違うことはない）。`data` と `layout` は、取得結果・Y 軸・対数軸設定が変わらない限り親の再レンダーで同じオブジェクトを渡す（`docs/frontend-design.md` §12）。
14. トレースが空配列の場合、`PlotlyChart` を描画せず、文言 `No planets match the current filters.` を表示する（`role` は付けない）。
15. 取得がエラーになった場合、`PlotlyChart` を描画せず、エラーメッセージを `role="alert"` で表示する（`ApiError` または `Error` の場合はその `message`、それ以外は `"Request failed"`）。後続の取得が開始された時点でエラー表示は受け入れ基準12のローディング表示に置き換わり、その取得も失敗した場合は新しいエラーメッセージを表示する。
16. 先行リクエストの結果が後から返っても、最新の `queryParams`／Y 軸選択の表示を上書きしない。
17. `PlotlyChart` の `onPointClick` で受け取った点の `customdata` が配列で、その先頭要素が空白以外の文字を含む文字列であり、かつ `"Not available"` ではない場合に限り、その文字列で `onSelectPlanet(planetName)` を1回呼ぶ。それ以外（`customdata` が配列でない、先頭が `"Not available"`・空文字・空白のみ・文字列以外）では呼ばない。
    - 注記: `planet_name` が `null` の点は `customdata[0]` が `"Not available"` となるため、詳細を開けない（`PlanetTable` が `planet_name` が `null` の行を選択不可とするのと同じ扱い）。実在の惑星名が `"Not available"` である場合は考慮しない。

### 3.4 `DashboardPage` との連携

18. `OrbitScatterPlot` に `usePlanetFilters().chartQueryParams`、`disabled={connection.status !== 'connected'}`、`onSelectPlanet={setSelectedPlanetName}` を渡す。点クリックで `PlanetDetailDrawer` が開き、`PlanetTable` の選択行ハイライトも連動する。
- 注記: 受け入れ基準18 の `DashboardPage` 結合の自動テストは手順 13 で扱う。本タスクでは `api/charts.ts`・`utils/chart.ts`・`OrbitScatterPlot` の単体テスト、および手動確認とする。

## 4. 影響する API・データ契約

- `GET /api/scatter/orbit-radius`（`docs/backend-design.md` §7.7）。使用するクエリ: `y_axis`, `discovery_method`, `disc_year_min`, `disc_year_max`。既存型 `ScatterOrbitRadiusQueryParams` / `ScatterOrbitRadiusResponse` / `ScatterYAxis` を使用し、型・契約の変更はしない。
- `chartQueryParams` は既存の `toChartFilterQueryParams` が生成する（発見手法・発見年のみ。半径・質量・公転周期・検索文字列などのフィルターは本 API の契約に無いため散布図には反映されない。`DiscoveryTimeline` と同じ扱い）。
- `docs/frontend-design.md` §7.3 の関数例 `getOrbitScatter(filters, yAxis)` は、既存 API 関数の規約（クエリパラメータオブジェクトを1つ受け取る）に合わせて `getOrbitScatter(params)` とし、`y_axis` を `params` に含める。
- 新規依存なし。

## 5. エッジケース・異常系の扱い

- 空結果: 受け入れ基準14。
- `orbital_period_days` / Y 軸値が `null`: 除外（受け入れ基準2）。
- 対数軸で値が `0` 以下: Plotly の対数軸では描画されない。データ上はほぼ発生しないため、特別扱いしない（線形軸に切り替えれば表示される）。
- `discovery_method` が `null`: `"Not available"` 系列（受け入れ基準2）。
- `planet_name` が `null` の点のクリック: 何もしない（受け入れ基準17）。
- 取得中に Y 軸を切り替え: 先行リクエストは破棄され、新しい Y 軸で再取得する（受け入れ基準10・16）。
- 取得中に対数軸を切り替え: 再取得せず、取得完了後の描画に反映される（受け入れ基準11・13）。
- ホバー文字列に含まれる惑星名などは `customdata` 経由で埋め込み、テンプレート文字列に直接連結しない（手法名のみリテラルで埋め込む。手順 9 と同じ）。
- テストでは `PlotlyChart` をモックする（手順 9 と同様）。

## 6. 未決事項

- なし。
