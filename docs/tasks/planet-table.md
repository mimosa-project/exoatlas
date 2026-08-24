# タスク仕様: `PlanetTable` を実装する

対応する実装順序: `docs/frontend-design.md` §14 手順 7「`PlanetTable` を実装する。」

## 1. 目的・背景

`docs/frontend-design.md` §8.6 に定義された `PlanetTable` コンポーネントを実装し、`GET /api/planets` の一覧結果を、ページング・ソート・行選択・空状態・ローディング状態を備えたテーブルとして `DashboardPage` に表示する。

現状 `DashboardPage` の該当領域はプレースホルダー（`DashboardPlaceholder title="Planet table"`）であり、本タスクでこれを実コンポーネントに置き換える。

あわせて、フロントエンドにはテスト基盤（Vitest）が未導入であるため、`AGENTS.md` の定めに従い、本タスクの中でテスト基盤の導入自体をスコープに含める。

## 2. スコープ

### 2.1 対象

- `frontend/src/utils/format.ts`: 数値の単位付きフォーマットと欠損値表示のユーティリティ（`docs/frontend-design.md` §9.1, §9.2 準拠）。
- `frontend/src/components/planets/PlanetTable.tsx`: 惑星一覧テーブル本体。
  - `GET /api/planets` の呼び出し（`api/planets.ts` の `getPlanets` を使用）。
  - ページング（`limit`/`offset`、初期 `limit=50`）。
  - ソート（列ヘッダークリックでの昇順・降順切り替え）。
  - 行クリックによる惑星選択（`onSelectPlanet` コールバック呼び出し。詳細ドロワー自体は対象外）。
  - 空状態・ローディング状態・エラー状態の表示。
- `DashboardPage.tsx` への組み込み（`Planet table` プレースホルダーの置き換え）。
- Vitest テスト基盤の導入（`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`、`package.json` の `test` スクリプト、`vite.config.ts` のテスト設定、セットアップファイル）。
- `frontend/src/styles/global.css` へのテーブル用スタイル追加。

### 2.2 対象外

- `PlanetDetailDrawer`（実装順序 8）本体の実装。本タスクでは `onSelectPlanet(planetName: string)` コールバックを呼ぶところまでとし、ドロワーの開閉・詳細取得は行わない。
- 選択行の永続的なハイライト表示（選択状態の視覚的な保持はドロワー実装時に扱う）。
- ページサイズの変更 UI（`limit` は `50` 固定。`docs/frontend-design.md` に page-size セレクタの言及はない）。
- URL クエリとの同期（`docs/frontend-design.md` §6.3 により MVP 対象外）。
- 列の表示/非表示のカスタマイズ、列幅のリサイズ。
- レスポンシブ時の横スクロール／列絞り込みの具体実装（`docs/frontend-design.md` §10.2 に方針の記載はあるが、詳細な挙動確認は実機検証に委ね、本タスクでは `overflow-x: auto` によるスクロール確保のみ行う）。
- `DiscoveryTimeline` / `OrbitScatterPlot` / `SkyMap`（実装順序 9〜11）。

## 3. 受け入れ基準

### 3.1 `utils/format.ts`

1. `formatOrbitalPeriod(326.03)` は `"326.03 d"` を返す。
2. `formatRadius(12.1)` は `"12.10 R_Earth"` を返す。
3. `formatMass(6165.6)` は `"6,165.60 M_Earth"` を返す（桁区切りを含む）。
4. `formatDistance(93.1846)` は `"93.18 pc"` を返す（小数第2位に丸める）。
   - 上記4関数はいずれも、実行環境の既定ロケールによらず常に `'en-US'` ロケール（桁区切りはカンマ、小数点はピリオド）でフォーマットする（`Intl.NumberFormat` 等に明示的にロケールを指定する）。
5. 上記いずれの関数も、値が `null` の場合は既定で `"Not available"` を返す。
6. 上記いずれの関数も、第2引数 `{ missingText: string }` を渡した場合、`null` のときにその文字列を返す（例: `formatRadius(null, { missingText: '-' })` は `"-"` を返す）。
7. 値が `0` の場合は欠損値として扱わず、フォーマット済みの `"0.00 ..."` 等を返す（`null` と `0` を区別する）。

### 3.2 `PlanetTable` の表示

8. `items` が1件以上ある場合、各行に Planet / Host / Method / Year / Period / Radius / Mass / Distance の8列を表示する（`docs/frontend-design.md` §5.3 の対応表に従う）。
9. Period / Radius / Mass / Distance の4列は `utils/format.ts` のフォーマット関数（`formatOrbitalPeriod` / `formatRadius` / `formatMass` / `formatDistance`）を使って表示する。Year 列は `discovery_year` の整数値をそのまま文字列化して表示する（桁区切り・単位は付けない。`docs/frontend-design.md` §9.1 のフォーマット対応表に Year の項目は無いため、`format.ts` の対象外とする）。Planet / Host / Method 列は文字列をそのまま表示する。
10. 各列の値が `null` の場合、その列は `"-"` を表示する（`docs/frontend-design.md` §9.2「テーブルでは視認性を優先し、短く `-` を使ってもよい」に従う）。Year 列も同様に `null` の場合は `"-"` を表示する。
11. データ取得中は、テーブル本体の代わりに、テキストで判別できるローディング状態を表示する（テーブルの列見出しは表示したままでよい）。
12. 取得結果の `items` が空配列の場合、空状態メッセージを表示する（テーブル行は描画しない）。空状態表示中も、ページング操作（Prev/Next）と範囲表示（受け入れ基準20）は表示・操作可能なままとする（範囲表示は取得済みの `total` に基づき更新する）。
13. 取得がエラーになった場合、エラーメッセージを `role="alert"` で表示する。この間もテーブルの列見出しは表示したままとする（受け入れ基準11のローディング状態と同様の扱いとする）。
14. `disabled` が `true`（API 未接続時）の場合、データ取得を行わず、接続待ちであることが分かる表示にする。

### 3.3 ページング

15. 初期表示は `limit=50`, `offset=0`, `sort='planet_name'`, `order='asc'`（バックエンドの既定値 `docs/backend-design.md` §7.3 と一致させる）で `getPlanets` を呼び出す。マウント時点で Planet 列の `th` に `aria-sort="ascending"` を設定する（受け入れ基準26と整合させる）。
16. ページ送り操作（Next相当の操作）は `offset` を `limit` 分進めて再取得する。
17. ページ戻し操作（Prev相当の操作）は `offset` を `limit` 分戻して再取得する。
18. `offset === 0` のとき、Prev 操作は無効化される（クリックしても `offset` が負にならない、または操作自体が無効化されている）。
19. `offset + limit >= total` のとき、Next 操作は無効化される。
20. 現在の表示範囲と総件数（例: `1–50 of 812`）をテキストで表示する。
21. `queryParams`（フィルター条件）が変化した場合、`offset` は `0` にリセットされて再取得する。

### 3.4 ソート

22. 列ヘッダーはボタンとして操作可能で、クリックすると当該列の `PlanetSortField` で `getPlanets` に `sort` を渡す。
23. 未ソート列をクリックすると、その列の昇順（`order=asc`）でソートする。
24. 既にソート中の列を再度クリックすると、`asc` ⇔ `desc` を切り替える。
25. 別の列をクリックすると、ソート対象列が切り替わり、新しい列は `asc` から開始する。
26. 現在ソート中の列には、視覚的またはテキストでソート方向が分かる表示がある（アクセシビリティのため `aria-sort` を該当 `th` に設定する）。
27. ソート対象・方向が変化した場合、`offset` は `0` にリセットされて再取得する。

### 3.5 行選択

28. `planet_name` が非 `null` の行をクリックすると、`onSelectPlanet(planet_name)` が1回呼ばれる。
29. `planet_name` が `null` の行はクリック不可（`onSelectPlanet` が呼ばれない）とする。
30. 行はキーボード操作（Enter または Space）でも選択できる（`docs/frontend-design.md` §11 のキーボード操作要件に対応するための行単位のフォーカス・操作性を確保する）。

## 4. 影響する API・データ契約

- `GET /api/planets`（`docs/backend-design.md` §7.3）を `frontend/src/api/planets.ts` の `getPlanets` 経由で呼び出す。新規 API 追加・契約変更は行わない。
- 使用するクエリパラメータ: フィルター系（`usePlanetFilters` の `listQueryParams` が生成する分。変更なし）に加え、`limit`, `offset`, `sort`, `order` を `PlanetTable` 内部状態から付与する。`PlanetTable` は props で受け取る `queryParams`（`PlanetListQueryParams`。フィルター条件のみ）に対し、自身が保持する `offset`／`sort`／`order` をオブジェクトスプレッドで直接マージして最終的な `PlanetListQueryParams` を組み立て、`getPlanets` に渡す（`toPlanetListQueryParams` の第一引数は `PlanetFilters` であり、`PlanetTable` が受け取る `queryParams`（`PlanetListQueryParams`）とは型が異なるため、`PlanetTable` 内部からこの関数を呼び出すことはできない）。
- 別途、`utils/query.ts` の `toPlanetListQueryParams(filters, pagination?)` はパラメータ組み立てロジックの集約方針（`docs/frontend-design.md` §6.3）に沿って第3引数 `sort?: PlanetTableSort`（`types/filters.ts` に定義済み）を受け取れるように拡張する（`toPlanetListQueryParams(filters, pagination?, sort?)`）。これは `PlanetFilters` を起点に呼び出す将来の呼び出し元（例: URL 同期実装時や `usePlanetFilters` 側でのソート状態管理への拡張）のための布石であり、本タスクの `PlanetTable` 自体はこの拡張を経由しない。既存の呼び出し元（`usePlanetFilters`）は第2・第3引数を省略したままでよく、挙動に変更はない。
- レスポンス型は既存の `PlanetListResponse`（`types/api.ts`）をそのまま使用する。型定義の変更は不要。
- `PlanetTable` の props（新規追加）:

  ```ts
  type PlanetTableProps = {
    queryParams: PlanetListQueryParams // フィルター条件のみ。limit/offset/sort/order は含めない
    disabled?: boolean
    onSelectPlanet: (planetName: string) => void
  }
  ```

  `queryParams` には `usePlanetFilters().listQueryParams`（ページング・ソート抜きのフィルター条件）をそのまま渡す。`disabled` には `DashboardPage` の `connection.status !== 'connected'` を渡す。

## 5. エッジケース・異常系の扱い

- `items` が空配列 かつ `total === 0`: 空状態表示（受け入れ基準12）。
- `items` が空配列だが `total > 0`（例: 最終ページより先に進んだ状態）: 空状態表示でよい（次ページ取得の再試行はユーザーが Prev で戻ることで解消する。自動での offset 補正は行わない）。
- フィルター変更中の連続リクエスト: `usePlanetFilters` 側で既に検索文字列を 300ms デバウンスしているため、`PlanetTable` 側で追加のデバウンスは行わない。ただし `queryParams` の参照が変わるたびに再取得すること（`useMemo` により実質的な変更時のみ参照が変わる前提。既存の `DashboardPage` の実装パターンと同様）。
- 取得中に `queryParams` / ソート / `offset` が変わった場合の競合: 直前のリクエストの結果が後から返っても状態を上書きしないよう、`DashboardPage` の既存パターン（`cancelled` フラグ）に倣ってガードする。
- `disabled` が取得中に `true` に変わった場合（API 接続が切れた場合）: 以後の自動取得を止め、「接続待ち」表示に戻す。表示済みの行データは必ずクリアする（古いデータを見せ続けない）。
- 初回表示後の再取得（ページング・ソート・フィルター変更による再取得）が失敗した場合: 直前まで表示していた行データは必ずクリアし、エラーメッセージのみを表示する（受け入れ基準13と同じ扱いとし、フィルターや表示中データの不整合を避ける）。
- `disabled` は `DashboardPage` の `connection.status !== 'connected'` に連動するため、`PlanetTable` は実際には `disabled=true`（`connection.status === 'loading'`）の状態でマウントされる。`disabled` が `true` から `false` に変わった時点で、まだ一度も取得を行っていなければ、受け入れ基準15 の初期パラメータ（`limit=50`, `offset=0`, `sort='planet_name'`, `order='asc'`）で取得を行う。Planet 列の `th` に対する `aria-sort="ascending"` の初期表示（受け入れ基準15後段）は、`disabled` の値やまだ取得が行われていないことに関わらず、マウント時点から適用する。
- 数値フォーマット関数への `NaN` / `Infinity` の入力: API 契約上発生しない前提とし、本タスクでは対処不要（バックエンドは `null` または有限数値を返す契約）。

## 6. 未決事項

- なし。
