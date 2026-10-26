# タスク仕様: チャート再取得まわりの修正（PR #3 レビュー対応）

対応: PR #3 のコードレビュー指摘 1〜3・7（ユーザー指示、2026-10-26）。

## 1. 目的・背景

PR #3 のレビューで次の問題が指摘された。

1. `usePlanetFilters` の `chartQueryParams` は全フィルターから作った `debouncedFilters` に依存するため、検索の打鍵や半径・質量・公転周期・ハビタブル候補の変更（いずれもチャート API に送られない）でも参照が変わり、3つのチャートが打鍵ごとに再取得される。`listQueryParams` も、debounce 前の検索の打鍵で（内容は同じまま）参照が変わり、一覧が再取得される。
2. 各チャートは再取得のたびに `PlotlyChart` をアンマウントするため、Plotly のグラフが破棄・再生成され、凡例での系列の表示切り替えやズームが失われ、表示がちらつく。
3. `DiscoveryTimeline` の `TIMELINE_LAYOUT` と `SkyMap` の `SKY_MAP_LAYOUT` はモジュール定数で、Plotly は渡された layout オブジェクトをコピーせずに保持・更新する（ズーム時に軸範囲を書き込む）。そのため、ある描画でのズーム状態が以後のすべてのマウントに残る。
7. 3つのチャートが同じ取得状態管理（状態・`cancelled` フラグ・待機／ローディング／エラー／空状態の描画分岐）を複製している。

本タスクでこれらを修正する。2 は、手順 9〜12 の仕様で「再取得中は `PlotlyChart` をアンマウントしローディング表示とする（MVP として許容）」としていた挙動の変更である。

## 2. スコープ

### 2.1 対象

- `hooks/usePlanetFilters.ts`: クエリパラメータの参照が、送信内容が変わる場合にのみ変わるようにする。
- `hooks/useChartData.ts`（新規）: チャート共通の取得状態管理フック。
- `components/charts/ChartPanelContent.tsx`（新規）: チャート共通の状態表示（待機・ローディング・エラー・空状態）とチャート本体の出し分け。
- `DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap` を上記で書き換え、再取得中も直前のチャートを表示し続ける。
- レイアウトをコンポーネントごとに生成し、`uirevision` で凡例・ズーム状態を再取得後も保持する。
- 上記に伴う既存テストの更新（仕様変更に伴うもの。§3.6 に列挙）。

### 2.2 対象外

- レビュー指摘 4（タイムラインの棒クリックでタイムライン自体が1年に絞られる）・5（`role="img"`）・6（WebGL 化）・8（`formatWithUnit` の引数）。
- `PlanetTable` の取得状態管理の共通化（一覧はページング・ソートを持ち構造が異なるため）。
- ローディング中のオーバーレイ表示（半透明の覆い等）の見た目の作り込み。本タスクではチャートの上にローディング文言を表示するのみとする。

## 3. 受け入れ基準

### 3.1 `usePlanetFilters` のクエリパラメータ

1. `chartQueryParams` の参照は、`discoveryMethod`・`discoveryYearMin`・`discoveryYearMax`・`distanceMin`・`distanceMax` のいずれかの値が変わった場合に新しくなり、それ以外（`q`・半径・質量・公転周期・`habitableCandidate` の変更を含む）では変わらない。判定はフィルター値の比較で行う（送信内容が結果的に同じでも、上記の値が変われば新しい参照になってよい）。
2. `listQueryParams` の参照は、debounce 後の検索文字列（`q`）または `q` 以外のいずれかのフィルター値が変わった場合に新しくなり、それ以外（debounce 中の検索の打鍵を含む）では変わらない。判定はフィルター値の比較で行う（例: debounce 後の `q` が `"a"` から `"a "` に変わると、送信内容は同じでも新しい参照になってよい）。
3. 値の内容（どのキーに何が入るか）は変更しない（既存の `toPlanetListQueryParams` / `toChartFilterQueryParams` のまま）。
4. `setFilter(key, 現在と同じ値)` を呼んでも、また既定値のまま `resetFilters()` を呼んでも、`listQueryParams` / `chartQueryParams` の参照は変わらない。
- 注記: フックが返す `debouncedFilters` の参照の扱いは規定しない（`DashboardPage` は使用していない）。

### 3.2 `useChartData`

```ts
type ChartDataStatus = 'waiting' | 'loading' | 'ready' | 'error'

function useChartData<P, R>(
  fetcher: (params: P) => Promise<R>,
  params: P,
  disabled: boolean,
): { status: ChartDataStatus; data: R | null; errorMessage: string | null }
```

5. `disabled` が `true` の間は `fetcher` を呼ばず、`status: 'waiting'`、`data: null` を返す。進行中の取得の結果は反映しない。`disabled` が `true` になった時点で保持していたデータは破棄する。そのため `false` に戻った後の取得中は、初回と同じく `data: null`（ローディング文言のみの表示）となる。
6. `disabled` が `false` の場合、`params` の参照が変わるたび（および `disabled` が `false` になった時点）に `fetcher(params)` を1回呼ぶ。`fetcher` は安定した参照（モジュール関数）を前提とし、`fetcher` の参照変更では再取得しない。呼び出し側は `params` をメモ化する（例: 散布図の `{ ...queryParams, y_axis }`）。
7. 取得中は `status: 'loading'`、`errorMessage: null` を返す。このとき `data` は直前に成功した取得結果のまま保持する（初回取得中、または直前がエラーの場合は `null`）。
8. 成功すると `status: 'ready'` と新しい `data` を返し、`errorMessage` は `null`。
9. 失敗すると `status: 'error'`、`data: null`、`errorMessage: toErrorMessage(error)` を返す。
10. 後続の取得が開始された後に返った先行の取得結果（成功・失敗とも）は反映しない。アンマウント後は状態を更新しない。

### 3.3 `ChartPanelContent`

```ts
type ChartPanelContentProps = {
  status: ChartDataStatus
  errorMessage: string | null
  loadingText: string
  emptyText: string
  hasChart: boolean        // 表示可能なトレースがあるか
  children: ReactNode      // PlotlyChart
}
```

11. `status: 'waiting'` のとき `LoadingState` で `Waiting for API connection…` のみを表示する（`children` は描画しない）。
12. `status: 'loading'` のとき `LoadingState` で `loadingText` をチャートの前（DOM 上で `children` の直前の兄弟要素。重ねて表示するオーバーレイではない）に表示し、`hasChart` が `true` なら `children` もあわせて描画する（直前のチャートを表示し続ける）。`children` は `ready` → `loading` → `ready` の間で React ツリー上の同じ位置に置き、再マウントされないようにする。`hasChart` が `false` なら `children` も空状態メッセージも描画しない。
13. `status: 'error'` のとき `ErrorMessage` で `errorMessage` のみを表示する。
14. `status: 'ready'` のとき、`hasChart` が `true` なら `children` を、`false` なら `EmptyState` で `emptyText` を表示する。
15. 既存のパネル固有クラス（`chart-panel__status`・`chart-panel__status--error`）を維持する。

### 3.4 各チャート

16. `DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap` は `useChartData` と `ChartPanelContent` を使う。文言（`Loading discovery timeline…` / `Loading orbit scatter plot…` / `Loading sky map…`、空状態・待機・エラーの文言）、`role`、`PlotlyChart` に渡す `ariaLabel` は変更しない。
17. 再取得中（`queryParams` の変更、散布図の Y 軸変更）は、直前の取得結果のチャートを表示したまま、ローディング文言（`role="status"`）をあわせて表示する。`PlotlyChart` はアンマウントされない（同じインスタンスに新しい `data` が渡り、`Plotly.react` でその場で更新される）。直前がエラーまたは空状態だった場合は、従来どおりローディング文言のみを表示する。
18. 散布図は、取得結果に取得時の Y 軸を付けて保持する。具体的には、モジュールレベルの安定した取得関数 `fetchOrbitScatter(params)` が `getOrbitScatter(params)` を呼び、`{ yAxis: params.y_axis, response }` を返す。これを `useChartData` の `fetcher` とする。表示中の `data`・`layout`・`uirevision` の Y 軸は、この `yAxis` を用いる。Y 軸変更による再取得中は、直前の Y 軸の `data` と `layout` を表示し続け（両者は一致したまま）、取得完了後に新しい Y 軸の `data` と `layout` に切り替わる。`Log scale` の切り替えは従来どおり再取得せず `layout` のみを更新する。
19. 各チャートの `layout` はコンポーネントのインスタンスごとに生成する（モジュールレベルで共有しない）。同一インスタンス内では、親の再レンダーで同じオブジェクトを渡す（従来の参照同一性の受け入れ基準を維持）。
20. 各 `layout` は `uirevision` を持ち、同じ値の間は Plotly がユーザー操作による状態（凡例による系列の表示切り替え、ズーム・パン）を保持する。値は、タイムライン `'discovery-timeline'`、天球マップ `'sky-map'`、散布図 `` `orbit-scatter-${yAxis}-${logScale ? 'log' : 'linear'}` `` とする。散布図の `yAxis` は表示中のデータの Y 軸（取得済みの Y 軸。ラジオボタンの選択値ではない）とする。散布図は軸の種類が変わるとズーム範囲が無意味になるため、`uirevision` の変化でズームと凡例の状態がリセットされる（意図した挙動）。
20a. 凡例の状態を系列に正しく結び付けるため、`buildTimelineTraces`・`buildOrbitScatterTraces`・`buildSkyMapTraces` の各トレースは `uid` に系列名（`name` と同じ発見手法ラベル）を持つ。これにより再取得で系列の並び順が変わっても、非表示にした系列は同じ発見手法のまま保持される。
21. `buildOrbitScatterLayout(yAxis, logScale)`・`buildSkyMapLayout()` は呼び出しごとに新しいオブジェクトを返し、上記 `uirevision` を含む。タイムラインのレイアウトは `utils/chart.ts` の `buildTimelineLayout()`（新規。従来の `TIMELINE_LAYOUT` と同じ内容に `uirevision` を加えたもの）で生成する。
22. 上記以外の既存の受け入れ基準（取得パラメータ、待機・エラー・空状態、先行リクエストの破棄、点クリック、メモ化）はすべて維持する。

### 3.5 結合

23. `DashboardPage` で検索ボックスに入力しても、debounce 中および debounce 後に、チャート API（`getDiscoveryTimeline`・`getOrbitScatter`・`getSkyMap`）は再度呼ばれない。半径の範囲入力の変更でもチャート API は再度呼ばれない。発見手法の変更では従来どおり再取得される。
24. 検索の debounce 中は、一覧の `getPlanets`（`limit: 50`）は再度呼ばれない。

### 3.6 既存テストの更新（仕様変更によるもの）

本仕様は以下の既存の受け入れ基準を置き換えるため、対応する既存テストを更新する。これ以外の既存テストは変更しない。

- `docs/tasks/discovery-timeline.md` 受け入れ基準16、`orbit-scatter-plot.md` 受け入れ基準12（再取得中の部分）、`sky-map.md` 受け入れ基準17（再取得中の部分）、`state-polish.md` §2.2（再取得中のアンマウント）: 本仕様の受け入れ基準17・18 に置き換える。対象テスト: `DiscoveryTimeline.test.tsx` の「hides the chart and shows loading while refetching (AC 16)」、`OrbitScatterPlot.test.tsx` の「hides the chart and shows loading while refetching after a Y axis change (AC 12)」、`SkyMap.test.tsx` の「hides the chart and shows loading while refetching (AC 17)」。
- `state-polish.md` 受け入れ基準10 の「タイムライン・天球マップはモジュール定数」: 本仕様の受け入れ基準19・21（インスタンスごとに生成、`buildTimelineLayout()`）に置き換える。この部分を直接検証する既存テストは無い（参照同一性のテストは同一インスタンス内のため維持される）。
- `orbit-scatter-plot.md` 受け入れ基準13 の理由付け「Y 軸変更時は受け入れ基準12によりローディング表示となるため、両者が食い違うことはない」: 本仕様では、受け入れ基準18（取得時の Y 軸を保持）によって `data` と `layout` が一致することを保証する。
- `uid`（受け入れ基準20a）・`uirevision`（受け入れ基準21）の追加: 既存のトレース・レイアウトのテストは `toMatchObject`、個別プロパティの検証、または同じビルダー関数の結果との `toEqual` で比較しているため、変更せずに通過する（確認済み）。
- `frontend-test-coverage.md` 受け入れ基準10 の「フィルターが変わると新しい参照になる」: 本仕様の受け入れ基準1・2 に置き換える。対象テスト: `usePlanetFilters.test.ts` の「creates new param objects when a filter changes (AC 10)」（`massMax` の変更で `chartQueryParams` が変わることを期待している）。
- `docs/tasks/discovery-timeline.md` 受け入れ基準15・`sky-map.md` 受け入れ基準16 の「`queryParams` の参照が変わるたびに再取得する（内容が同じでも再取得を許容）」はコンポーネントの契約としてそのまま維持する（参照を変えないのは `usePlanetFilters` 側の責務とする）。同受け入れ基準15 の括弧書き「`chartQueryParams` は検索文字列など timeline に無関係なフィルター変更でも参照が変わるため」は本仕様により事実でなくなる。
- `docs/tasks/state-polish.md` §5「import 失敗後、再取得で `PlotlyChart` が再マウントされた際には再 import を試みる」: 本仕様で再取得時に再マウントしなくなるため、チャートが表示中のまま再取得した場合は再 import を試みなくなる（空状態・エラー・待機を経てチャートが再表示されたときのみ再マウントされ再 import する）。Plotly のチャンク読み込み失敗はまれであり、ページ再読み込みで回復できるため MVP として許容する。既存テスト `PlotlyChart.importError.test.tsx` は変更しない。

## 4. 影響する API・データ契約

- API 契約の変更なし。
- `utils/chart.ts` に `buildTimelineLayout()` を追加。`buildOrbitScatterLayout`・`buildSkyMapLayout` の戻り値に `uirevision` が加わる。

## 5. エッジケース・異常系の扱い

- 再取得中に `disabled` が `true` になった場合: 待機表示に切り替え、直前のチャートも表示しない（受け入れ基準5・11）。
- 再取得の結果が空になった場合: 取得完了時に空状態メッセージに切り替わる（`PlotlyChart` はその時点でアンマウントされる）。
- 再取得の結果がエラーになった場合: 取得完了時にエラー表示に切り替わる（直前のチャートは消える）。
- `disabled` が `true` → `false` と変わった場合: 以前のチャートは再表示せず、初回と同じくローディング文言のみを表示する（受け入れ基準5）。
- Plotly 側の挙動（`Plotly.react` によるその場の更新、`uirevision` による凡例・ズーム状態の保持）は、単体テストでは Plotly をモックするため検証できない。単体テストでは同じ要素が維持されることと、渡す props（`uid`・`uirevision` を含む）を検証し、Plotly 側の挙動は手動で確認する。
- タイムライン・天球マップのズーム・パンは、フィルター変更後も意図的に保持する。新しいデータがズーム範囲外にある場合は、ユーザーがダブルクリック等でリセットする。
- `PlotlyChart` が描画・読み込みに失敗して `Chart could not be displayed.` を表示している場合、再取得中もその表示は残り、以後の `Plotly.react` が成功した時点で消える（手順 12 の挙動のまま）。
- 表示件数の `getPlanets`（`limit: 1`）は、従来どおり検索の debounce 中は呼ばれない（受け入れ基準24 とは別に、既存の `isDebouncingSearch` による制御）。
- 凡例で非表示にした系列が再取得後のデータに存在しない場合: その系列は表示されない。後の再取得で再び現れた場合は、`uid` が同じため非表示状態が引き継がれうる（Plotly の挙動に委ねる）。
- 散布図で Y 軸の再取得中に `Log scale` を切り替えた場合: 旧 Y 軸のデータ・レイアウトのまま対数軸設定のみ変わり、`uirevision` が変わるためズームと凡例の状態はリセットされる。
- Plotly による layout オブジェクトの書き換え: 同一インスタンス内では起こりうるが、`uirevision` によりユーザー操作の状態として保持されるため問題としない。インスタンス間では layout を共有しない（受け入れ基準19）。

## 6. 未決事項

- なし。
