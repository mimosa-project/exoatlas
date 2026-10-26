# タスク仕様: ローディング・空状態・エラー状態を整える

対応する実装順序: `docs/frontend-design.md` §14 手順 12「ローディング、空状態、エラー状態を整える。」

## 1. 目的・背景

手順 7〜11 で各パネル（`PlanetTable`・`PlanetDetailDrawer`・`DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap`・KPI）が個別にローディング・空状態・エラー表示を実装しており、同じ規約（`role="status"` / `role="alert"` / 役割なしの空状態、`toErrorMessage` による文言決定）が各ファイルに重複している。`docs/frontend-design.md` §4 の推奨構成にある `components/ui/LoadingState.tsx`・`EmptyState.tsx`・`ErrorMessage.tsx` を導入して共通化し、表示を揃える。

あわせて、手順 9〜11 の仕様で「手順 12 で扱う」とした以下を解消する。

- チャートの暗色テーマ対応（`docs/frontend-design.md` §9.3「暗色テーマを基本候補とする」。現状は Plotly 既定の白背景）と、半幅パネルで凡例が描画領域を圧迫する問題（凡例を下部横並びにする）。
- Plotly の読み込み・描画失敗時にチャート領域が空のままになる問題（`docs/tasks/discovery-timeline.md` §5）。テキストでエラーを示す（`docs/frontend-design.md` §11「エラー状態を色だけで表現しない」）。
- 未使用となった CSS（`.dashboard-panel--placeholder`・`.dashboard-panel__description`）の削除（`docs/tasks/sky-map.md` §2.2）。
- API 接続エラー時の回復手段が無い問題。`docs/frontend-design.md` §7.4「API 全体が落ちている場合は、ヘッダーまたはページ上部に接続エラーを表示する」に対し、表示は既にあるため、再接続（Retry）操作を追加する。

## 2. スコープ

### 2.1 対象

- `frontend/src/utils/error.ts`（新規）: `toErrorMessage` の共通化。
- `frontend/src/components/ui/LoadingState.tsx`・`EmptyState.tsx`・`ErrorMessage.tsx`（新規）。
- 既存パネル（`PlanetTable`・`PlanetDetailDrawer`・`DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap`・`DashboardPage` の KPI）を上記共通部品・共通関数を使うよう置き換える（表示文言・ロールは原則維持。変更点は受け入れ基準に明記）。
- `utils/chart.ts` にチャート共通テーマ（`withChartTheme`）を追加し、タイムライン・散布図・天球マップのレイアウトに適用。
- `PlotlyChart` に描画失敗時のテキスト表示を追加。
- `Header` に再接続ボタン、`DashboardPage` に再接続処理を追加。
- `global.css` の未使用スタイル削除と共通部品用スタイルの整理。
- ダッシュボードの天球マップと惑星一覧の横並び（`.dashboard__split` の2列グリッド）を縦並びに変更する（`docs/frontend-design.md` §10.1「メイン領域はチャートと一覧を縦に配置する」。半幅では天球マップの凡例が描画領域を圧迫するため）。手動確認とする。

### 2.2 対象外

- 再取得中も前回のチャートを表示し続ける（オーバーレイ表示する）挙動への変更。手順 9〜11 の仕様どおり、再取得中は `PlotlyChart` をアンマウントしローディング表示とする（Plotly の再生成によるちらつきは MVP として許容する。再検討の結果、表示状態の単純さを優先して現状維持とする）。
- スケルトン表示・スピナー等のアニメーション。
- 自動リトライ・指数バックオフ（再接続はユーザー操作のみ）。
- パネル単位の再試行ボタン（各パネルはフィルター変更で再取得されるため、本タスクでは API 全体の再接続のみ扱う）。
- 明色テーマ・テーマ切り替え（`docs/requirements.md` §14 未決事項のまま）。
- `DashboardPage` 結合の自動テスト（手順 13）。
- 接続は成功したが KPI 取得・表示件数取得のみ失敗した場合の回復操作（エラーは各 KPI に表示され、フィルター変更で表示件数は再取得される。再接続ボタンは表示しない）。

## 3. 受け入れ基準

### 3.1 `utils/error.ts`

1. `toErrorMessage(error: unknown): string` は、`ApiError` または `Error` の場合はその `message` を、それ以外の値（文字列・`null`・`undefined`・オブジェクト等）の場合は `"Request failed"` を返す。
2. 既存の各ファイル内のローカル `toErrorMessage`（`PlanetTable`・`PlanetDetailDrawer`・`DiscoveryTimeline`・`OrbitScatterPlot`・`SkyMap`・`DashboardPage`）は削除し、本関数を使う（文言の挙動は変わらない）。

### 3.2 `components/ui`

3. `LoadingState`（props: `children: ReactNode`、`className?: string`、`'data-testid'?: string`）は `role="status"` の `<p>` に `children` を表示する。`aria-live` 属性は明示しない（`role="status"` が暗黙に `polite` を持つため。既存の明示指定は削除される）。
4. `EmptyState`（props: `children: ReactNode`、`className?: string`、`'data-testid'?: string`）は `role` を持たない `<p>` に `children` を表示する。
5. `ErrorMessage`（props: `children: ReactNode`、`className?: string`、`'data-testid'?: string`）は `role="alert"` の `<p>` に `children` を表示する。
6. 3〜5 はいずれも共通クラス `state-message` と、それぞれ `state-message--loading` / `state-message--empty` / `state-message--error` を持ち、`className` 指定時はそれも付与する（既存のパネル固有クラスを維持するため）。`data-testid` 指定時はその値を `<p>` の `data-testid` 属性に付与する。
7. 既存パネルのローディング・待機・空状態・エラー表示を 3〜5 で置き換える。各表示の文言・`role` の有無は変更しない（既存の単体テストは変更なしで通過すること）。既存のパネル固有クラス（`chart-panel__status`・`chart-panel__status--error`・`planet-table__status`・`planet-table__status--error`・`planet-drawer__status`・`planet-drawer__status--error`・`dashboard__kpis-loading`・`dashboard__kpis-error`・`kpi-card__error`）は `className` で維持する。`PlanetTable` の `data-testid` も維持する。
8. `DashboardPage` の KPI ローディング表示 `Loading metrics…` は `LoadingState` を使い、`role="status"` を持つようになる（変更点。`docs/frontend-design.md` §11「ローディング状態をテキストでも示す」）。KPI のエラー表示（`dashboard__kpis-error`・`kpi-card__error`）は `ErrorMessage` を使う（文言・`role="alert"` は変わらない）。

### 3.3 チャート共通テーマ

9. `utils/chart.ts` の `withChartTheme(layout: Partial<Layout>): Partial<Layout>` は、テーマの既定値に入力をマージしたレイアウトを返す（入力を破壊的に変更しない）。戻り値のネストしたオブジェクトは呼び出しごとに新しく生成する（テーマ既定値の共有オブジェクトを返さない）。マージ規則: すべてのキーで入力側の値が優先される。`font`・`xaxis`・`yaxis`・`legend`・`margin` は1階層の深さでマージする（例: 入力の `xaxis.title` とテーマの `xaxis.gridcolor` が両方残る）。入力に該当キーが無い場合、テーマの既定値は次のとおり。
   - `paper_bgcolor: 'rgba(0,0,0,0)'`、`plot_bgcolor: 'rgba(0,0,0,0)'`。
   - `font.color: '#e7ecf3'`（`global.css` の `--color-text`）。
   - `xaxis.gridcolor` / `yaxis.gridcolor` / `xaxis.zerolinecolor` / `yaxis.zerolinecolor` が `'#2f3d52'`（`--color-border`）。入力の `xaxis` / `yaxis` の他のキー（`title`・`type`・`range`・`tickformat` 等）は保持する。
   - `legend: { orientation: 'h', x: 0, y: -0.25, yanchor: 'top' }`（凡例を描画領域の下に横並びで表示する。値は規定値とし、変更する場合は仕様・テストの更新から行う）。
   - `margin: { t: 16, r: 16, b: 48, l: 56 }`。
   - `xaxis.automargin: true`・`yaxis.automargin: true`（凡例・軸ラベルの重なりを Plotly の自動余白で回避する）。
10. `DiscoveryTimeline` に渡す `layout`（モジュール定数 `TIMELINE_LAYOUT`）、`buildOrbitScatterLayout(...)`、`buildSkyMapLayout()` の結果は、いずれも `withChartTheme` を適用したものとする。`buildOrbitScatterLayout` / `buildSkyMapLayout` は関数内部で `withChartTheme` を適用して返す（コンポーネント側で包まない）。既存の受け入れ基準のキー（`barmode`・`showlegend`・`hovermode`・軸タイトル・`type`・`range`・`tickformat`）は変更しない。テーマ適用後のレイアウトも、各コンポーネントで親の再レンダーごとに作り直さない（タイムライン・天球マップはモジュール定数、散布図は `useMemo`。既存の参照同一性の受け入れ基準を維持する）。
10a. チャートの高さ: `.plotly-chart` の `min-height: 20rem` を固定の高さ `height: 24rem` に置き換え、Plotly（`responsive: true`）がコンテナに合わせて描画するようにする（レイアウトに `height` は指定しない）。手動確認とする。

### 3.4 `PlotlyChart` の描画失敗表示

11. `plotly.js-dist-min` の動的 import が失敗した場合、ラッパー要素（`role="img"`）は描画したまま、その**兄弟要素**として `ErrorMessage`（`role="alert"`）で `Chart could not be displayed.` を表示する（`role="img"` 要素の後ろに置き、`role="img"` 要素の子には置かない。Plotly が子要素を管理し、また `img` の子は支援技術に公開されないため）。
12. `Plotly.react` が reject した場合も同じ文言を表示する。その後の `Plotly.react` が成功した時点で表示を消す。表示・消去を決めるのは最新の `Plotly.react` 呼び出し（現在の `data` / `layout` に対するもの）の結果のみとし、後続の呼び出しが開始された後に返った先行呼び出しの成功・失敗は表示を変えない。最新の呼び出しが未完了の間は、既存の表示（表示中なら表示のまま）を維持する。
13. 失敗していない間はこの文言を表示しない。アンマウント後には状態を更新しない。既存の `PlotlyChart` の受け入れ基準（`docs/tasks/discovery-timeline.md` §3.3）は、§3.3 受け入れ基準12 の「チャート領域は空のままとなる」の部分を本タスクの受け入れ基準11・12 で置き換えるほかは維持する（例外を握りつぶし未処理の Promise rejection を発生させない挙動はそのまま）。

### 3.5 API 再接続

14. `Header` に省略可能な prop `onRetry?: () => void` を追加する。`connection.status` が `'error'` かつ `onRetry` が指定されている場合のみ、アクセシブル名 `Retry connection` のボタンを表示し、クリックで `onRetry` を1回呼ぶ。それ以外の状態では表示しない。ボタンは接続状態の `<p>`（エラー時 `role="alert"`）の外（兄弟要素）に置く。
15. `DashboardPage` は `onRetry` で接続確認（`getHealth()` と `getPlanets({ limit: 1 })`）および KPI 取得をやり直す。KPI 状態も初期状態 `{ status: 'idle' }` に戻す。再試行開始時に `connection` を `{ status: 'loading' }` に戻す（ヘッダーは `Connecting…` 表示になる）。成功すれば各パネルの `disabled` が解除され取得が始まる。
16. 再試行中に再度失敗した場合は、新しいエラーメッセージで `{ status: 'error' }` を表示する。中断・置き換えられた接続確認（アンマウントや StrictMode の二重実行を含む）の結果は状態に反映しない。
- 注記: 受け入れ基準15・16 の `DashboardPage` 結合の自動テストは手順 13 で扱う。本タスクでは `Header` の単体テストと手動確認とする。

### 3.6 CSS

17. `.dashboard-panel--placeholder`・`.dashboard-panel__description` を `global.css` から削除する。
18. `.state-message` 系のスタイルを追加し、ローディング・空状態は `--color-muted`、エラーは `--color-error` の文字色とする。エラーは色だけでなく文言（エラーメッセージ本文）で判別できる（既存どおり）。

## 4. 影響する API・データ契約

- API 契約・型の変更なし。
- `Header` の props に `onRetry?: () => void` を追加（後方互換）。
- `PlotlyChart` の props は変更しない。

## 5. エッジケース・異常系の扱い

- `toErrorMessage` に `ApiError` のサブクラスや `message` が空文字の `Error` が渡された場合: その `message`（空文字を含む）をそのまま返す（既存挙動と同じ）。
- 何らかの理由で再試行が重ねて開始された場合（StrictMode の二重実行など）: 最後の再試行の結果のみ反映する（受け入れ基準16）。通常はボタンが `loading` 中に非表示となるため連打は起きない。
- 再接続中（`status: 'loading'`）はボタンを表示しない（受け入れ基準14）。
- `PlotlyChart` の import 失敗後に同一インスタンスで `data` が変わった場合: 再 import は行わない。失敗表示は残る。ただし import 失敗時はモジュールレベルのキャッシュが破棄されるため、再取得で `PlotlyChart` が再マウントされた際には再 import を試みる（手順 9 の実装どおり。意図した挙動）。
- 再接続ボタンのクリック後、ボタンは非表示になりフォーカスは `body` に戻る。MVP として許容する。
- `withChartTheme` に `xaxis` / `yaxis` / `legend` / `margin` を持たないレイアウトを渡した場合: テーマ側の値のみで各オブジェクトを生成する。

## 6. 未決事項

- なし。
