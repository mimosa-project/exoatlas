# タスク仕様: Vitest で主要ユーティリティとコンポーネントを検証する

対応する実装順序: `docs/frontend-design.md` §14 手順 13「Vitest で主要ユーティリティとコンポーネントを検証する。」

## 1. 目的・背景

手順 7〜12 では各タスクの新規挙動について単体テストを追加してきたが、`docs/frontend-design.md` §13 のテスト方針に対して次の不足がある。

- §13.1「API クエリ生成」: `toPlanetListQueryParams` / `toChartFilterQueryParams` / `hasActiveFilters` は、ソート・ページング（手順 7）と距離（手順 11）しかテストされていない。
- §13.2「`FilterPanel` の入力変更がフィルター状態に反映される」: 距離以外の入力、およびフィルター状態を管理する `usePlanetFilters` / `useDebouncedValue` がテストされていない。
- §13.3 結合観点（初期表示で API が呼ばれる／検索条件変更で一覧とチャートが更新される／散布図またはテーブルから詳細ドロワーを開ける）が未検証。手順 8〜12 の仕様で「手順 13 で扱う」とした `DashboardPage` 結合の受け入れ基準も未検証である。

本タスクではテストのみを追加し、これらを埋める。

## 2. スコープ

### 2.1 対象

- `frontend/src/utils/query.mapping.test.ts`（新規）: クエリ生成の網羅テスト（既存の `query.test.ts`・`query.distance.test.ts` は変更しない）。
- `frontend/src/hooks/useDebouncedValue.test.ts`・`usePlanetFilters.test.ts`（新規）。
- `frontend/src/components/filters/FilterPanel.test.tsx`（新規）。
- `frontend/src/pages/DashboardPage.test.tsx`（新規）: 結合テスト。
- 上記に伴い、テストから参照しやすくするための**最小限の**本体変更が必要になった場合はその変更（受け入れ基準31）。

### 2.2 対象外

- 新機能・既存挙動の変更（テストで不具合が見つかった場合は、本仕様書 §7 に不具合を記録し、再現テストは `it.fails(...)`（Vitest。失敗することを期待するテスト）として記録の参照コメント付きで追加する。これにより `npm test` は通過したまま再現手順が残る。修正は別タスクとしてユーザーに確認する。ただし受け入れ基準31 の範囲は除く）。
- E2E テスト（Playwright 等）、ビジュアルリグレッション、カバレッジ計測の導入・閾値設定。
- `docs/frontend-design.md` §13 のうち既存テストで満たされている項目の追加テスト（§13.1 数値・`null` 表示フォーマット: `format.test.ts`・`format.detail.test.ts`。§13.2 `PlanetTable` の各状態: `PlanetTable.test.tsx`、`PlanetDetailDrawer` の取得開始: `PlanetDetailDrawer.test.tsx`、チャートの空データ: 各チャートのテスト）。
- 再接続中のアンマウント時に結果を反映しないこと（手順 12 受け入れ基準16 後半。DOM で観測できないためコードレビュー項目とする）。
- Plotly 実体の描画テスト（`PlotlyChart` はモックする。手順 9〜11 と同様）。
- バックエンドのテスト。

### 2.3 ワークフロー上の扱い

本タスクの成果物はテストそのものであり、対象の挙動は既に実装済みである。そのため `AGENTS.md` ステップ 3 の「実装前に red を確認する」は、実装を一時的に壊すとテストが失敗すること（ミューテーション確認）で代替する（ユーザー確認済み、2026-10-26）。最低限、§3.1・§3.2・§3.3・§3.4 の各グループで1件以上、加えて受け入れ基準25・26・27 についてそれぞれ1件のミューテーション確認を行い、（壊した内容, 失敗したテスト）の組を本仕様書 §7 に記録する。確認後、実装は元に戻す。ステップ 5 の「実装」は、追加したテストが既存実装に対して通過することの確認とし、ステップ 6 ではテストとテスト対象を合わせてレビューする。

## 3. 受け入れ基準

各項目は「〜であることを検証するテストが存在し、通過する」を意味する。

### 3.1 クエリ生成（`utils/query.ts`）

1. `toPlanetListQueryParams` は、各フィルターを対応する API キーへ変換する: `q`（前後空白を除去）→`q`、`discoveryMethod`→`discovery_method`、発見年・半径・質量・公転周期・距離の各 Min/Max→`disc_year_min`/`disc_year_max`/`radius_min`/`radius_max`/`mass_min`/`mass_max`/`orbital_period_min`/`orbital_period_max`/`distance_min`/`distance_max`、`habitableCandidate: true`→`habitable_candidate: true`。
2. `toPlanetListQueryParams` は、空文字・空白のみの `q`、`null` の `discoveryMethod`・数値、`false` の `habitableCandidate` をキーごと含めない。数値 `0` は含める。
3. `toChartFilterQueryParams` は発見手法・発見年・距離のみを含め、`q`・半径・質量・公転周期・`habitableCandidate` は含めない（手順 11 の距離テストと重複しない範囲で、発見手法・発見年を検証する）。
4. `hasActiveFilters` は既定値で `false`、いずれか1つのフィルター（`q` は空白以外を含む場合のみ、`habitableCandidate` は `true` の場合）が設定されると `true` を返す。全フィルターキーについて検証する。

### 3.2 フック

5. `useDebouncedValue(value, delay)` は、初回は `value` をそのまま返し、`value` 変更後 `delay` ミリ秒経過するまでは前の値を返し、経過後に新しい値を返す。`delay` 内に再度変更された場合はタイマーがリセットされ、最後の変更から `delay` 経過後に最後の値を返す。
6. `usePlanetFilters` の初期 `filters` は `DEFAULT_PLANET_FILTERS` と等しい。
7. `setFilter(key, value)` で `filters` の該当キーのみが更新される。`resetFilters()` で既定値に戻る。
8. `q` の変更は 300ms 後に `listQueryParams.q` に反映され、それまでは `isDebouncingSearch` が `true`、反映後は `false`。`q` 以外のフィルター変更は即座に `listQueryParams` / `chartQueryParams` に反映される。
9. `chartQueryParams` は `q` を含まない。
10. 親の再レンダー（`renderHook` の `rerender()`。`setFilter` を呼ばない）では `listQueryParams` / `chartQueryParams` の参照が維持される。`setFilter` / `resetFilters` の参照も維持される。

### 3.3 `FilterPanel`

11. 検索ボックス（ラベル `Search`）の入力（制御コンポーネントのため `fireEvent.change` 等で値を一括設定する）で `onFilterChange('q', 入力文字列)` が呼ばれる。
12. 発見手法セレクト（ラベル `Discovery method`）は `All methods` と `discoveryMethods` の各手法を選択肢に持ち、手法の選択で `onFilterChange('discoveryMethod', 手法名)`、`All methods` の選択で `onFilterChange('discoveryMethod', null)` が呼ばれる。
13. 発見年・半径・質量・公転周期の各範囲入力（凡例 `Discovery year` / `Radius (Earth radii)` / `Mass (Earth masses)` / `Orbital period (days)`）の Min/Max 入力で、対応するキー（`discoveryYearMin` 等）と数値が渡される。空欄は `null`。
14. `Habitable candidate (simplified)` チェックボックスの切り替えで `onFilterChange('habitableCandidate', boolean)` が呼ばれる。
15. `Reset` ボタンは、有効なフィルターが無いとき（空白のみの `q` を含む）無効、あるとき有効で、クリックで `onReset` が1回呼ばれる。
16. `isDebouncingSearch` が `true` のとき `Updating search…` を表示し、`false` のとき表示しない。
17. `disabled` のとき、検索・セレクト・全範囲入力・チェックボックス・`Reset` が無効になる（有効なフィルターがあっても `Reset` は無効）。
18. 表示値が `filters` の値を反映する（例: `q`・選択中の手法・数値・チェック状態）。

### 3.4 `DashboardPage` 結合

API モジュール（`api/health`・`api/planets`・`api/discoveries`・`api/charts`）と `PlotlyChart` をモックし（`getPlanets` は引数に応じて応答を返し分ける実装とする。チャート API は `PlotlyChart` が描画されるよう有効な項目を1件以上返す）、実際の `DashboardPage`（`usePlanetFilters`・`FilterPanel`・各パネルを含む）を描画して検証する。`PlotlyChart` のモックは、受け取った `ariaLabel` と `onPointClick` をテストから呼び出せるようにする。

19. 初期表示（§13.3「初期表示で API が呼ばれる」）: `getHealth` と `getPlanets` が呼ばれ、接続成功後にヘッダーが `API connected (<status>)` と総件数を表示する。KPI（Total planets / Displayed / Discovery methods / Discovery years）が表示される。`DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap` の各 API と一覧の `getPlanets`（`limit: 50, offset: 0`）が呼ばれる。発見手法セレクトに `getDiscoveryMethods` の結果が並ぶ。
20. KPI 取得中は `Loading metrics…` が `role="status"` で表示される（手順 12 受け入れ基準8）。
21. 接続失敗: `getHealth` が失敗すると、ヘッダーに `API unavailable: <message>` と `Retry connection` ボタンが表示され、各パネル（タイムライン・散布図・天球マップ・一覧の4つ）は `Waiting for API connection…` を表示する。接続確認の `getPlanets({ limit: 1 })` は呼ばれてよいが、一覧の `getPlanets`（`limit: 50` を含む呼び出し）、`getDiscoveryTimeline`・`getOrbitScatter`・`getSkyMap`・`getDiscoveryMethods` は呼ばれない。フィルター入力は無効。
22. 再接続（手順 12 受け入れ基準15・16）: `Retry connection` をクリックするとヘッダーが `Connecting…` になり、再度 `getHealth` が呼ばれる。（`Connecting…` を観測するため、再試行の `getHealth` は保留中の Promise とする。）`Connecting…` の間は `Loading metrics…` を表示しない。再試行開始時に `getHealth` と並行して `getPlanets({ limit: 1 })` が再度呼ばれ、成功後に `getDiscoveryMethods` が呼ばれて KPI が表示され、各パネルの取得が始まりフィルターが有効になる。再試行も失敗した場合は新しいエラーメッセージと `Retry connection` が表示される。
23. フィルター変更（§13.3「検索条件変更で一覧とチャートが更新される」）: 発見手法を選択すると、一覧の `getPlanets`、表示件数の `getPlanets`、`getDiscoveryTimeline`、`getOrbitScatter`、`getSkyMap` がいずれも `discovery_method` 付きで再度呼ばれる。
24. 距離フィルター（手順 11 受け入れ基準24 ほか）: 距離 Min/Max を入力すると、一覧・`getDiscoveryTimeline`・`getOrbitScatter`・`getSkyMap` に `distance_min` / `distance_max` が渡される。
25. 検索（debounce）: 検索ボックスへの入力では 300ms 経過まで一覧の `getPlanets` に `q` が渡されず、経過後に `q`（前後空白除去済み）付きで呼ばれる。入力中は `Updating search…` が表示される。チャート API には `q` が渡されない。
26. タイムラインの棒クリック（手順 9 受け入れ基準22・23）: `Discovery timeline chart` の `onPointClick` に `{ x: 2015, y: 1, customdata: 2015, curveNumber: 0, pointIndex: 0 }` を渡すと、`Discovery year` の Min/Max 入力が `2015` になり、一覧の `getPlanets`・表示件数の `getPlanets`・`getDiscoveryTimeline` がいずれも `disc_year_min: 2015, disc_year_max: 2015` を含む引数で呼ばれる。
27. 一覧から詳細（手順 8 受け入れ基準20〜22、§13.3）: 一覧の行をクリックすると `getPlanetDetail(惑星名)` が呼ばれ、`role="dialog"` のドロワーが当該惑星名で表示され、その行に `aria-current="true"` が付く。`Close details` をクリックするとドロワー（`role="dialog"` と `.app-shell__drawer`）が DOM から消え、行の `aria-current` も外れる。
28. 散布図から詳細（手順 10 受け入れ基準18、§13.3）: `Orbit scatter plot chart` の `onPointClick` に `customdata[0]` が惑星名の点を渡すと、その惑星のドロワーが開き、一覧の行に `aria-current="true"` が付く（モックの一覧レスポンスはクリックする惑星を含むこと）。
29. 天球マップから詳細（手順 11 受け入れ基準24）: `Sky map chart` の `onPointClick` で同様にドロワーが開き、一覧の該当行に `aria-current="true"` が付く。
30. Escape キーでドロワーが閉じる（手順 8 受け入れ基準16 の結合確認）。

### 3.5 その他

31. テストのために本体コードへ加える変更は、テスト用の識別子（`data-testid`）の追加など挙動を変えないものに限る。挙動を変える変更が必要になった場合は §2.2 に従う。
32. `npm test`（`vitest run`）・`npm run lint`・`npm run build` が通過する。テストは乱数・実時間に依存しない（debounce は §5 のとおり fake timers で決定的に検証する）。

## 4. 影響する API・データ契約

- なし（テストのみ）。

## 5. エッジケース・異常系の扱い

- `DashboardPage` は `StrictMode` なしで描画する（既存テストと同じ前提）。
- 用語: 「一覧の `getPlanets`」は `limit: 50` を含む呼び出し、「表示件数の `getPlanets`」は `limit: 1` かつ `sort` を含まない呼び出し（接続確認の `{ limit: 1 }` と同形のため、フィルターキーの有無で区別する）。引数の検証は `expect.objectContaining` で行う（各コンポーネントが `group_by_method`・`sort` 等を付加するため）。
- 件数表示は `toLocaleString()` に依存するため、テストデータの件数は 1,000 未満とするか、期待値を `toLocaleString()` で生成する。
- debounce の「300ms 経過までは呼ばれない」は、`shouldAdvanceTime` を使わない fake timers で時計を明示的に進めて（`vi.advanceTimersByTime(299)` → 未呼び出しを確認 → `1` 進める）決定的に検証する。fake timers 有効中は `waitFor` / `findBy` を使わず、時計を進める操作は `act(...)` で包む。確認後に real timers へ戻してから非同期の待機を行う。受け入れ基準5・8 も同様。
- `hasActiveFilters` は `discoveryMethod: ''` を有効と判定するが、UI からは `''` が設定されない（`MethodSelect` が `null` に変換する）ため、本タスクでは検証対象外とし既知事項として記録する。
- 結合テストでの API 呼び出し回数は、`useEffect` の実行順や debounce により変動しうるため、原則として「特定の引数で呼ばれたこと（`toHaveBeenCalledWith` / 最後の呼び出し）」で検証し、厳密な総回数は検証しない。ただし「呼ばれないこと」（受け入れ基準21・25）は検証する。
- fake timers を使う場合、Testing Library の `userEvent.setup({ advanceTimers })` と組み合わせ、テスト終了時に real timers へ戻す。

## 6. 未決事項

- なし。

## 7. ミューテーション確認・既知事項の記録

### 7.1 ミューテーション確認（2026-10-26 実施。確認後に実装は元へ戻した）

| グループ / AC | 壊した内容 | 失敗したテスト |
| --- | --- | --- |
| §3.1 | `toPlanetListQueryParams` で `q` を trim しない | `query.mapping.test.ts` の3件（AC 1・2） |
| §3.2 | `useDebouncedValue` の遅延を 0ms にする | `useDebouncedValue.test.ts`・`usePlanetFilters.test.ts` の3件（AC 5・8） |
| §3.3 | 半径 Min の変更を `radiusMax` として通知する | `FilterPanel.test.tsx` の1件（AC 13） |
| §3.4 AC 22 | 再接続で接続確認を再実行しない | `DashboardPage.test.tsx` の2件 |
| §3.4 AC 24 | `toChartFilterQueryParams` から `distance_max` を落とす | `DashboardPage.test.tsx` の1件 |
| AC 25 | 検索文字列を debounce せずに使う | `DashboardPage.test.tsx` の1件 |
| AC 26 | 棒クリックで `discoveryYearMax` を設定しない | `DashboardPage.test.tsx` の1件 |
| AC 27 | ドロワーの `onClose` で選択を解除しない | `DashboardPage.test.tsx` の2件（AC 27・30） |

### 7.2 既知事項

- `hasActiveFilters` は `discoveryMethod: ''` を有効と判定するが、`toPlanetListQueryParams` は送信しない。UI からは `''` が設定されないため実害はなく、本タスクでは修正しない（§5）。
- テストで新たな不具合は見つからなかった。
