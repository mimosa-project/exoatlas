# タスク仕様: PR #3 再レビュー対応（タイムライン API の欠損値・数値フィルターの debounce・取得の中断）

対応: PR #3 の再レビュー指摘 1〜3（ユーザー指示、2026-10-26）。

## 1. 目的・背景

1. `GET /api/discoveries/timeline` は発見手法を `groupby(..., dropna=False)` で集計するため、発見手法が欠損した惑星があると 欠損値（ローダーの正規化後は `pd.NA`）がそのまま応答モデル（`str | None`）に渡り、HTTP 500 になる（再現済み）。現行データセットには欠損行が無いため実害は出ていないが、フロントエンド（`buildTimelineTraces`）は `null` を「Not available」系列として扱う前提であり、API 契約（欠損値は `null`。`docs/backend-design.md`）にも反する。
2. 数値の範囲入力（発見年・半径・質量・公転周期・距離）は1文字ごとにフィルター状態を更新するため、`"1500"` の入力で `1`→`15`→`150`→`1500` と一覧・表示件数・3チャートの取得が走る（約20リクエスト）。検索文字列は既に 300ms の debounce がある。
3. `useChartData` は後続の取得が始まると先行の結果を無視するが、通信自体は中断しない。

## 2. スコープ

### 2.1 対象

- バックエンド: `services/planets.py` の `discovery_timeline` で欠損した発見手法を `None` として返す。pytest 追加。
- `hooks/usePlanetFilters.ts`: 数値の範囲フィルターを検索文字列と同じく 300ms debounce してからクエリパラメータに反映する。
- `hooks/useChartData.ts`: 置き換えられた取得・アンマウント・`disabled` 化の際に `AbortSignal` で通信を中断する。
- `api/discoveries.ts` の `getDiscoveryTimeline`、`api/charts.ts` の `getOrbitScatter`・`getSkyMap` に省略可能な `options?: { signal?: AbortSignal }` を追加し、`apiGetJson` に渡す。
- `docs/frontend-design.md` §8.2・§12 に、数値の範囲入力も 300ms debounce することを追記。
- 仕様変更に伴う既存テストの更新（§3.5 に列挙）。

### 2.2 対象外

- `PlanetTable`・KPI・`PlanetDetailDrawer` の取得の中断（数値フィルターの debounce により一覧の過剰な取得は解消されるため）。
- 範囲入力の Min > Max などの入力検証。
- 他の API（一覧・散布図・天球マップ）の欠損値処理（既存の `dataframe_to_api_records` 経由で `null` に変換済み）。
- 前回レビュー・再レビューの他の指摘（`role="img"`、WebGL、ホバーへの手法名埋め込み、`usePlanetFilters` の構造、ドロワーの `null` 分岐、チャート外枠の共通化、`toErrorMessage` の冗長分岐）。

## 3. 受け入れ基準

### 3.1 バックエンド: タイムラインの欠損した発見手法

1. `discovery_timeline(..., group_by_method=True)` は、発見手法が欠損した惑星を年ごとに1件の項目へ集計し、その `discovery_method` を `None` とする。`count` は欠損行の件数。
2. `GET /api/discoveries/timeline` は発見手法が欠損した惑星を含むデータでも `200` を返し、該当項目の `discovery_method` は JSON の `null`。
3. 発見手法が欠損していないデータでの結果、`group_by_method=False` の結果、距離・年・手法フィルターの挙動は変わらない（既存テストがすべて通過する）。

### 3.2 数値フィルターの debounce（`usePlanetFilters`）

4. 次の10フィールドを「数値フィルター」とする: `discoveryYearMin`・`discoveryYearMax`・`radiusMin`・`radiusMax`・`massMin`・`massMax`・`orbitalPeriodMin`・`orbitalPeriodMax`・`distanceMin`・`distanceMax`。
5. `filters`（入力欄の表示値）は `setFilter` 直後に更新される（従来どおり）。
6. 数値フィルターの変更は、最後の**数値フィルターの**変更から 300ms 経過後に `listQueryParams` / `chartQueryParams` に反映される。300ms 以内に続けて変更された場合は最後の値のみが反映され、途中の値は反映されない。複数の数値フィルターを続けて変更した場合も、最後の変更から 300ms 後にまとめて反映される。`q`・`discoveryMethod`・`habitableCandidate` の変更は、数値フィルターのタイマーを再開も即時確定もしない。
7. `discoveryMethod` と `habitableCandidate` の変更は、従来どおり即座に反映される（debounce しない）。このとき、debounce 中の数値フィルターの値はまだ反映しない（反映済みの値のまま）。
8. `q` の debounce（300ms）と `isDebouncingSearch`（`filters.q` と反映済みの `q` が異なる間 `true`）は従来どおり。数値フィルターの debounce は `isDebouncingSearch` に影響しない。
9. `resetFilters()` と、タイムラインの棒クリックによる発見年の設定（`setFilter` 経由）も、数値フィルターについては 300ms 後に反映される（`discoveryMethod`・`habitableCandidate`・`q` の扱いは 7・8 のとおり）。
10. 参照の安定性（`docs/tasks/chart-refetch-fixes.md` 受け入れ基準1〜4）は、「値が変わった場合」を「反映済みの値が変わった場合」と読み替えて維持する。

### 3.3 取得の中断（`useChartData`）

11. `fetcher` の型を `(params: P, signal: AbortSignal) => Promise<R>` とし、取得ごとに新しい `AbortController` の `signal` を渡す。
12. `params` の変更による再取得、`disabled` が `true` になったとき、アンマウント時に、進行中の取得の `signal` を中断（abort）する。
13. 中断された取得の失敗（`AbortError` 等）は状態に反映しない（従来の「置き換えられた結果を反映しない」と同じ）。
14. 成功・失敗した取得の `signal` は、完了後に中断しても状態に影響しない。

### 3.4 API 関数

15. `getDiscoveryTimeline(params, options?)`・`getOrbitScatter(params, options?)`・`getSkyMap(params, options?)` は、`options.signal` があれば `apiGetJson` の第2引数にちょうど `{ signal }`（他のキーなし）を渡す。`options` または `options.signal` を省略した場合は、従来どおり `apiGetJson` を第2引数なしで呼ぶ（既存の API テストの `toHaveBeenCalledWith(path)` を維持する）。
16. 各チャートは `useChartData` から受け取った `signal` を API 関数に `{ signal }` として渡す（API 関数を `fetcher` に直接渡すと `signal` が第2引数の `options` の位置に入ってしまうため、`(params, signal) => getX(params, { signal })` の形で包む）。

### 3.5 既存テストの更新（仕様変更によるもの）

先行仕様の置き換え: `docs/tasks/chart-refetch-fixes.md` §3.2 の `fetcher: (params: P) => Promise<R>`、受け入れ基準6 の「`fetcher(params)` を1回呼ぶ」、受け入れ基準18 の「`fetchOrbitScatter(params)` が `getOrbitScatter(params)` を呼ぶ」は、本仕様の受け入れ基準11・16（`signal` を第2引数で受け渡す）に置き換える。`docs/frontend-design.md` §7.3 の API 関数例は、省略可能な第2引数 `options` で拡張される（後方互換）。また、各チャートの API 呼び出しを定めた `docs/tasks/discovery-timeline.md` 受け入れ基準15（`getDiscoveryTimeline({ ...queryParams, group_by_method: true })`）、`orbit-scatter-plot.md` 受け入れ基準10（`getOrbitScatter({ ...queryParams, y_axis })`）、`sky-map.md` 受け入れ基準16（`getSkyMap(queryParams)`）は、第2引数 `{ signal }` を加えた呼び出しに置き換える（本仕様の受け入れ基準16）。
- `docs/tasks/frontend-test-coverage.md` 受け入れ基準32 および §5（「テストは実時間に依存しない。debounce は fake timers で決定的に検証する」）の例外: `DashboardPage.test.tsx` のうち、数値フィルターの変更後に取得を待つ既存の3テスト（距離フィルター〈受け入れ基準24〉、タイムラインの棒クリック〈受け入れ基準26〉、`chart-refetch-fixes` 受け入れ基準23 の半径・発見手法のテスト）は、300ms の反映待ちを既存の `waitFor`（既定タイムアウト 1000ms）で吸収する。300ms に対して十分な余裕があるため実質的に安定しており、結合テストに fake timers を導入する複雑さを避けるためである。「〜まで呼ばれない」という否定の検証は、従来どおり fake timers で行う（`usePlanetFilters.test.ts`）。

本仕様は以下を置き換えるため、対応する既存テストを更新する。これ以外の既存テストは変更しない。

- `docs/tasks/frontend-test-coverage.md` 受け入れ基準8 の「`q` 以外のフィルター変更は即座に `listQueryParams` / `chartQueryParams` に反映される」: 数値フィルターについては本仕様の受け入れ基準6 に置き換える。対象: `usePlanetFilters.test.ts` の「applies non-search filters to both param sets immediately (AC 8)」（`discoveryYearMin` を使用）。
- `docs/tasks/chart-refetch-fixes.md` 受け入れ基準1・2・4 のテストのうち、数値フィルターの変更直後に参照の変化を期待するもの: 300ms 経過後に検証するよう更新する。対象: `usePlanetFilters.test.ts` の「creates a new listQueryParams but keeps chartQueryParams for a list-only filter」「creates new chart and list params when %s changes」（数値フィールドの場合）「keeps chartQueryParams when %s changes」（数値フィールドの場合）「keeps the param contents unchanged (AC 3)」「keeps both references when a filter is set to its current value (AC 4)」、`usePlanetFilters.test.ts` の「updates only the given key with setFilter …」は `filters` のみを検証しており変更不要。
- `useChartData` のテストで `fetcher` を `vi.fn<(params) => Promise<…>>()` と型付けしているもの: 第2引数 `signal` を受け取る型に更新する（各アサーションの意味は変えない）。`toHaveBeenCalledWith(params)` は `toHaveBeenCalledWith(params, expect.any(AbortSignal))` に更新する。
- 各チャートのコンポーネントテストで API モックの呼び出し引数を `toHaveBeenCalledWith(params)` / `toHaveBeenLastCalledWith(params)` で厳密に検証しているもの（`OrbitScatterPlot.test.tsx` の y_axis: mass の `toHaveBeenLastCalledWith` を含む）: 第2引数 `{ signal: expect.any(AbortSignal) }` を許容するよう更新する。
- `DashboardPage.test.tsx` の結合テストで、チャート API の呼び出し引数を `toHaveBeenCalledWith(expect.objectContaining(...))` で検証しているものは第2引数が増えると一致しなくなるため、同様に第2引数を許容するよう更新する。数値フィルターの反映待ちは既存の `waitFor`（既定 1000ms）で吸収されるため、それ以外の変更はしない。

## 4. 影響する API・データ契約

- `GET /api/discoveries/timeline`: 発見手法が欠損した項目の `discovery_method` が `null` になる（従来は 500 エラー）。契約上の型（`string | null`）は変わらない。
- フロントエンドの API 関数に省略可能な第2引数 `options` を追加（後方互換）。

## 5. エッジケース・異常系の扱い

- 数値入力の途中で `Reset` を押した場合: 入力欄は即座に空になり、300ms 後に既定値で反映される。途中の値は反映されない。
- 数値入力の debounce 中にアンマウント: タイマーは `useDebouncedValue` の cleanup で破棄される。
- 中断された取得が `ApiError`（status 0、`AbortError` のメッセージ）として reject される場合も、状態に反映しない（受け入れ基準13）。
- 数値フィルターが 300ms 以内に A→B→A と戻った場合: 反映済みの値は変わらないため、`listQueryParams` / `chartQueryParams` の参照も変わらない（受け入れ基準10）。
- debounce 中に数値フィルターへ現在と同じ値を `setFilter` した場合: 値の変更ではないため、タイマーは再開しない。
- 発見手法の「欠損」は、CSV の空欄・空白のみの文字列（ローダーが `pd.NA` に正規化する）および `None` / `NaN` を含む。
- `resetFilters()` 直後は、`q` と数値フィルターがそれぞれ 300ms 後に反映されるため、一覧の取得が1回または2回になりうる（いずれも許容）。
- フックが返す `debouncedFilters` が数値フィルターについて反映前・反映後のどちらの値を持つかは規定しない（`DashboardPage` は使用しない）。
- タイムラインの年ごとの項目の並びで、発見手法が `null` の項目の位置は規定しない（テストは順序に依存しない形で検証する）。
- 発見手法と発見年の両方が欠損した行: 既存どおり年の欠損で除外される。

## 6. 未決事項

- なし。
