# タスク仕様: PR #3 レビューの残り項目への対応

対応: PR #3 の初回レビュー指摘 4・5・8（ユーザー指示、2026-10-26）。指摘 6（散布図・天球マップの WebGL 化）はユーザー判断により見送る。

## 1. 目的・背景

4. タイムラインの棒をクリックすると発見年フィルター（`discoveryYearMin = discoveryYearMax = 年`）が設定され、タイムライン自体もその1年分だけに絞られる。別の年を選び直すにはサイドバーで年フィルターを解除する必要がある。ユーザー判断（2026-10-26）により、タイムラインの取得には発見年フィルターを適用せず、常に全年を表示し続ける。

> 要件定義書との関係: `docs/requirements.md` §7.3 は「年範囲を指定して表示範囲を絞れる」としている。サイドバーの年範囲はタイムラインに適用されなくなるため、この要件はタイムラインのズーム（ドラッグでズーム、ダブルクリックで解除。`docs/tasks/chart-refetch-fixes.md` の `uirevision` によりフィルター変更後も保持される）で満たすこととし、ユーザー確認（2026-10-26）のうえ `docs/requirements.md` §7.3 にその旨を追記する。
5. `PlotlyChart` のラッパー要素が `role="img"` のため、支援技術からは子要素（凡例・軸ラベル等）が提示されない（`img` ロールの子は表示上のものとして扱われる）。チャートは操作可能な図であり、`img` は意味的に不適切である。
8. `utils/format.ts` の内部関数 `formatWithUnit` が、省略可能な `options` の後ろに位置引数 `fractionDigits`・`separator` を取るため、呼び出し側（`formatDegrees` など）が読みにくい。

## 2. スコープ

### 2.1 対象

- `hooks/usePlanetFilters.ts`: タイムライン用のクエリパラメータ `timelineQueryParams` を追加。
- `pages/DashboardPage.tsx`: `DiscoveryTimeline` に `timelineQueryParams` を渡す。
- `docs/frontend-design.md` §8.3 と `docs/requirements.md` §7.3 の更新。
- `components/charts/PlotlyChart.tsx`: ラッパー要素のロールを `figure` に変更。
- `utils/format.ts`: `formatWithUnit` の引数の整理（挙動は変えない）。
- 仕様変更に伴う既存テストの更新（§3.4 に列挙）。

### 2.2 対象外

- 散布図・天球マップの WebGL 化（ユーザー判断で見送り）。
- タイムライン上での選択年の強調表示（ユーザー判断で採用しない選択肢）。
- チャート上の点・棒をキーボードで選択する操作（Plotly の SVG 要素にフォーカス可能な操作を追加することは本タスクでは行わない）。キーボード利用者は、同じ操作をサイドバーの発見年入力（年の絞り込み）と惑星一覧の行（詳細ドロワー）で行える（`docs/frontend-design.md` §11「チャートだけでなくテーブルでも主要データを確認できるようにする」）。ただし、タイムライン自体の表示範囲の絞り込み（ズーム）はマウス操作のみとなり、キーボードでは行えない。これは MVP として許容する制約とする。
- 再レビューで見送りと判断した項目（ホバーへの手法名の埋め込み、`usePlanetFilters` の構造、ドロワーの `null` 分岐、チャート外枠の共通化、`toErrorMessage` の冗長な分岐）。

## 3. 受け入れ基準

### 3.1 タイムラインに発見年フィルターを適用しない（指摘 4）

1. `usePlanetFilters` は `timelineQueryParams` を返す。内容は `chartQueryParams` から `disc_year_min`・`disc_year_max` を除いたもの（`discovery_method`・`distance_min`・`distance_max` のみ）。
2. `timelineQueryParams` の参照は、`discoveryMethod`・反映済みの `distanceMin`・`distanceMax` のいずれかが変わった場合に新しくなり、それ以外（発見年を含む）の変更では変わらない。
3. `DashboardPage` は `DiscoveryTimeline` の `queryParams` に `timelineQueryParams` を渡す。`OrbitScatterPlot`・`SkyMap` には従来どおり `chartQueryParams` を渡す。
4. タイムラインの棒をクリックすると、従来どおり `discoveryYearMin`・`discoveryYearMax` が設定され、一覧・表示件数・散布図・天球マップはその年で再取得される。タイムライン（`getDiscoveryTimeline`）は再取得されず、全年の表示が続く。
5. サイドバーの発見年入力の変更でも、タイムラインは再取得されない。`setFilter` で現在と同じ値を設定した場合や、既定値のまま `resetFilters()` を呼んだ場合も `timelineQueryParams` の参照は変わらない。発見手法・距離の変更では従来どおり再取得される。
6. `DiscoveryTimeline` コンポーネント自体の契約（受け取った `queryParams` に `group_by_method: true` を加えて取得する）は変更しない。
- 注記: 受け入れ基準4・5 の「再取得されない」は、新しい年での一覧の `getPlanets` 呼び出し（数値フィルターの debounce 後）を観測した後に検証する（`docs/tasks/review2-fixes.md` §3.5 の `waitFor` の扱いに従う）。

### 3.2 チャートのロール（指摘 5）

7. `PlotlyChart` のラッパー要素は `role="figure"` と `aria-label={ariaLabel}` を持つ（`role="img"` は付けない）。アクセシブル名は従来どおり `ariaLabel`。
8. 描画失敗時のエラーメッセージ（`docs/tasks/state-polish.md` 受け入れ基準11・12）は、従来どおりラッパー要素の直後の兄弟要素とする。

### 3.3 `formatWithUnit` の整理（指摘 8）

9. `formatWithUnit` は `(value, unit, settings?: { missingText?: string; fractionDigits?: number; separator?: string })` の形で設定を1つのオブジェクトで受け取る（既定値: `missingText` は `'Not available'`、`fractionDigits` は `2`、`separator` は `' '`）。公開関数（`formatOrbitalPeriod` 等）のシグネチャと出力は変えない（既存の `format.test.ts`・`format.detail.test.ts` が変更なしで通過する）。`formatWithUnit` は export しないため、シグネチャはコードレビューで確認し、挙動は既存テストで確認する。

### 3.4 既存テストの更新（仕様変更によるもの）

本仕様は以下を置き換えるため、対応する既存テストを更新する。これ以外の既存テストは変更しない。

- `docs/tasks/discovery-timeline.md` 受け入れ基準23 の「タイムライン自体が当該年で絞り込まれる」、`docs/tasks/frontend-test-coverage.md` 受け入れ基準26 の「`getDiscoveryTimeline` がいずれも `disc_year_min: 2015, disc_year_max: 2015` を含む引数で呼ばれる」: 本仕様の受け入れ基準4 に置き換える。対象: `DashboardPage.test.tsx` の「narrows the year range to a clicked timeline bar (AC 26)」。
- `docs/tasks/discovery-timeline.md` 受け入れ基準22 の「`DiscoveryTimeline` に `usePlanetFilters().chartQueryParams` を渡す」: 本仕様の受け入れ基準3（`timelineQueryParams` を渡す）に置き換える（このためのテスト変更は無い）。
- `docs/tasks/discovery-timeline.md` 受け入れ基準7（`role="img"`）と `docs/tasks/state-polish.md` 受け入れ基準11 の `role="img"` の記述（エラーメッセージの位置関係と理由づけ）: 本仕様の受け入れ基準7・8 に置き換える（ロール名のみの変更で、兄弟要素として配置する点は同じ）。対象（いずれも要素の取得方法 `getByRole('img', …)` を `getByRole('figure', …)` に置き換えるのみで、アサーションは変更しない）: `PlotlyChart.test.tsx` の「renders a wrapper with role="img" …（AC 7）」（テスト名も更新）、「calls Plotly.react once after the dynamic import …（AC 8）」、「shows "Chart could not be displayed." next to the chart when Plotly.react rejects …」（state-polish 受け入れ基準12 由来）、`PlotlyChart.importError.test.tsx` の import 失敗のテスト（state-polish 受け入れ基準11 由来）。
- `docs/frontend-design.md` §8.3 に「タイムライン自体の取得には発見年フィルターを適用しない（棒クリックで選んだ年は一覧・KPI・他のチャートに反映される）」を追記する。
- `docs/requirements.md` §7.3 の「年範囲を指定して表示範囲を絞れる」に「タイムラインではチャートのズームで行い、サイドバーの年範囲は一覧・KPI・他のチャートに適用する」旨を追記する。

## 4. 影響する API・データ契約

- API 契約の変更なし（タイムライン API に発見年パラメータを送らなくなるのみ）。
- `usePlanetFilters` の戻り値に `timelineQueryParams` を追加。

## 5. エッジケース・異常系の扱い

- サイドバーで発見年を範囲指定した場合も、タイムラインは全年を表示する（受け入れ基準5）。KPI「Displayed」・一覧・散布図・天球マップは範囲で絞り込まれる。
- 年範囲だけが設定された状態で `resetFilters()` を呼んだ場合: 発見手法・距離は変わらないため、タイムラインは再取得されない（受け入れ基準2）。
- 発見手法を選択した場合は、タイムラインもその手法だけの積み上げ（1系列）になる（従来どおり）。
- `role="figure"` の要素の子（Plotly が生成する SVG）は支援技術から参照可能になるが、Plotly の SVG にはテキストラベル以外の説明が無い。チャートの内容は一覧（テーブル）で確認できる（§2.2）。

## 6. 未決事項

- なし。
