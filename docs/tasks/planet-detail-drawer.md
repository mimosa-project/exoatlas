# タスク仕様: `PlanetDetailDrawer` を実装する

対応する実装順序: `docs/frontend-design.md` §14 手順 8「`PlanetDetailDrawer` を実装する。」

## 1. 目的・背景

`docs/frontend-design.md` §5.4 / §8.7 に定義された惑星詳細ドロワーを実装する。`PlanetTable` の行選択（手順 7 で `onSelectPlanet` まで実装済み）を受けて、`GET /api/planets/{planet_name}` から詳細を取得し、基本情報・惑星・軌道・恒星・位置の各セクションを表示する。

現状 `DashboardPage` は `onSelectPlanet` で `selectedPlanetName` を保持するのみで、その値を使用していない。また `docs/tasks/planet-table.md` §2.2 で「選択行の永続的なハイライト表示はドロワー実装時に扱う」としていたため、本タスクで扱う。

## 2. スコープ

### 2.1 対象

- `frontend/src/utils/format.ts` への詳細表示用フォーマット関数の追加（§3.1）。
- `frontend/src/components/planets/PlanetDetailDrawer.tsx` の新規作成。
- `DashboardPage.tsx` への組み込み（`AppShell` の `drawer` スロットに配置し、`selectedPlanetName` と連動させる）。
- `PlanetTable` への選択行ハイライト用 prop `selectedPlanetName` の追加。
- `frontend/src/styles/global.css` へのドロワー用スタイル追加（デスクトップは右側ドロワー、幅 768px 以下は画面下からのパネル。`docs/frontend-design.md` §10）。

### 2.2 対象外

- 散布図・天球マップからドロワーを開く操作（手順 10・11 で各チャート側から `onSelectPlanet` を呼ぶ形で扱う。本タスクではドロワーが `planetName` を受け取れば表示できることのみ保証する）。
- ルート分割された詳細ページ、URL 同期（`docs/frontend-design.md` §2.2, §6.3）。
- フォーカストラップ（ドロワーはモーダルではなく非モーダルのサイドパネルとして扱う）。
- 詳細データのキャッシュ（同じ惑星を再選択した場合も再取得してよい）。
- 太陽系惑星との比較などの分析表示（`docs/requirements.md` Phase 4）。

## 3. 受け入れ基準

### 3.1 `utils/format.ts` の追加関数

いずれも既存関数と同様に `'en-US'` ロケール固定で、`null` の場合は既定で `"Not available"`、第2引数 `{ missingText }` 指定時はその文字列を返す。`0` は欠損値として扱わない。

1. `formatTemperature(4742)` は `"4,742 K"` を返す（小数点以下は四捨五入して0桁）。`formatTemperature(254.6)` は `"255 K"` を返す。
2. `formatSemiMajorAxis(1.29)` は `"1.29 AU"` を返す（小数第2位）。
3. `formatDensity(19.1)` は `"19.10 g/cm³"` を返す（小数第2位）。
4. `formatStellarRadius(19)` は `"19.00 R_Sun"` を返す（小数第2位）。
5. `formatStellarMass(2.7)` は `"2.70 M_Sun"` を返す（小数第2位）。
6. `formatDegrees(185.1787793)` は `"185.1788°"` を返し、`formatDegrees(-5.5)` は `"-5.5000°"` を返す（小数第4位、単位と数値の間に空白なし）。
7. 上記いずれも `null` を渡すと `"Not available"` を返し、`{ missingText: '-' }` 指定時は `"-"` を返す。`0` を渡すと `"0 K"` / `"0.00 AU"` / `"0.0000°"` のようにフォーマット済みの値を返す。

### 3.2 `PlanetDetailDrawer` の表示

Props:

```ts
type PlanetDetailDrawerProps = {
  planetName: string | null
  onClose: () => void
}
```

8. `planetName` が `null` の場合は何も描画しない（DOM に `role="dialog"` の要素が存在しない）。
9. `planetName` が非 `null` の場合、`role="dialog"` の要素を描画し、その `aria-labelledby` が見出し要素を指す。見出しには、取得成功後は詳細レスポンスの `planet_name`（`null` の場合は `planetName`）を、それ以外（取得中・エラー時）は `planetName` を表示する。
10. `planetName` が非 `null` になった時点（マウント時を含む）で `getPlanetDetail(planetName)` を1回呼び出す。`planetName` が同じまま再レンダーされた場合（`onClose` の参照変更を含む）は再取得しない。
11. 取得中は、テキストで判別できるローディング表示（`role="status"`、文言 `Loading details…`）を出す。
12. 取得成功時、以下の5セクションを表示する。各セクションは `<section aria-labelledby="<見出しのid>">` とし、見出しテキスト（Basic / Planet / Orbit / Star / Position）をアクセシブル名とする（`getByRole('region', { name: 'Orbit' })` で取得できる）。各項目は `<dl>` 内の隣接する `<dt>`（ラベル）/ `<dd>`（値）の組で表示し、`<dt>` の直後の兄弟要素が対応する `<dd>` となる。

    | セクション | ラベル | 値 | 表示 |
    | --- | --- | --- | --- |
    | Basic | Planet | `planet_name` | 文字列そのまま |
    | Basic | Host | `host_name` | 文字列そのまま |
    | Basic | Discovery year | `discovery_year` | 整数を桁区切りなしで文字列化 |
    | Basic | Discovery method | `discovery_method` | 文字列そのまま |
    | Planet | Radius | `planet.radius_earth` | `formatRadius` |
    | Planet | Mass | `planet.mass_earth` | `formatMass` |
    | Planet | Density | `planet.density` | `formatDensity` |
    | Planet | Equilibrium temperature | `planet.equilibrium_temperature` | `formatTemperature` |
    | Orbit | Orbital period | `orbit.orbital_period_days` | `formatOrbitalPeriod` |
    | Orbit | Semi-major axis | `orbit.semi_major_axis_au` | `formatSemiMajorAxis` |
    | Star | Temperature | `star.stellar_temperature` | `formatTemperature` |
    | Star | Radius | `star.stellar_radius` | `formatStellarRadius` |
    | Star | Mass | `star.stellar_mass` | `formatStellarMass` |
    | Star | Spectral type | `star.stellar_spectral_type` | 文字列そのまま |
    | Position | Right ascension | `position.right_ascension` | `formatDegrees` |
    | Position | Declination | `position.declination` | `formatDegrees` |
    | Position | Distance | `position.distance_parsec` | `formatDistance` |

13. 値が `null` の項目は `"Not available"` と表示する（`docs/frontend-design.md` §5.4。テーブルと異なり `-` は使わない）。空文字や `0` で代替しない。
14. 取得がエラーになった場合、ドロワー内にエラーメッセージを `role="alert"` で表示する（`ApiError` または `Error` の場合はその `message`。例: 404 時のバックエンド `detail`。それ以外の値の場合は `"Request failed"`）。この間もドロワー自体と閉じるボタンは表示したままとする。

### 3.3 開閉・操作

15. ドロワー内に、アクセシブル名 `Close details` のボタンを表示し、クリックすると `onClose` を1回呼ぶ。
16. ドロワー表示中に Escape キーを押すと `onClose` を1回呼ぶ。フォーカスがドロワー外（例: `document.body`）にある場合も同様に1回呼ぶ（`document` レベルで keydown を監視する）。`planetName` が `null` のときは Escape で `onClose` を呼ばない。
17. マウント時に `planetName` が非 `null` の場合、および `planetName` が `null` から非 `null` に変わった場合、閉じるボタンにフォーカスを移す（`docs/frontend-design.md` §11 キーボード操作）。`planetName` が非 `null` から別の非 `null` 値へ変わった場合はフォーカスを移動しない。閉じた後に元の行へフォーカスを戻す処理は対象外とする。ドロワーは非モーダルであり `aria-modal` は付けない。Escape は `document` レベルで監視するため、他の入力欄にフォーカスがある場合も閉じる（意図した挙動とする）。
18. `planetName` が別の非 `null` 値に変わった場合、新しい `planetName` で再取得し、以前の惑星の詳細およびエラー表示は表示しない（取得中はローディング表示）。
19. 先行リクエストの結果が後から返っても、現在の `planetName` の表示を上書きしない。

### 3.4 `DashboardPage` との連携

20. `PlanetTable` の行選択で `selectedPlanetName` が設定される。`DashboardPage` は `selectedPlanetName` が非 `null` のときのみ `AppShell` の `drawer` に `<PlanetDetailDrawer planetName={selectedPlanetName} … />` を渡し、`null` のときは `drawer` を渡さない（`AppShell` は `drawer` が falsy の場合ラッパー要素 `.app-shell__drawer` を描画しないため、閉じている間はドロワー領域が DOM に残らない）。
21. ドロワーの `onClose` で `selectedPlanetName` を `null` に戻す（`docs/frontend-design.md` §8.7「閉じたときに選択状態を解除する」）。
22. `PlanetTable` に `selectedPlanetName` を渡す（受け入れ基準23・24）。
- 注記: `PlanetDetailDrawer` は API 接続状態を props に取らず参照もしない。
- 受け入れ基準20〜22 の `DashboardPage` 結合の自動テストは手順 13 で扱う。本タスクでは `PlanetDetailDrawer` と `PlanetTable` の単体テスト、および手動確認とする。

### 3.5 `PlanetTable` の選択行ハイライト

23. `PlanetTable` に省略可能な prop `selectedPlanetName?: string | null` を追加する。省略時は `null` と同じ扱い。
24. `selectedPlanetName` が非 `null` で、行の `planet_name` が `selectedPlanetName` と一致する行にのみ `aria-current="true"` を付与し、視覚的にもハイライトする（CSS クラス `planet-table__row--selected`）。それ以外の行には `aria-current` 属性を付けない。`selectedPlanetName` が `null`／省略の場合はどの行にも付けず、`planet_name` が `null` の行には常に付けない。
25. 既存の `PlanetTable` の受け入れ基準（`docs/tasks/planet-table.md` §3）はすべて維持する。

## 4. 影響する API・データ契約

- `GET /api/planets/{planet_name}`（`docs/backend-design.md` §7.4）を既存の `frontend/src/api/planets.ts` の `getPlanetDetail` 経由で呼び出す。URL エンコードは `getPlanetDetail` 内で既に行われている。
- レスポンス型は既存の `PlanetDetail`（`types/api.ts`）を使用する。型定義・API 契約の変更は行わない。
- `PlanetTable` の props に `selectedPlanetName?: string | null` を追加する（後方互換）。
- `AppShell` の既存 `drawer` スロットを使用する。`AppShell` の props は変更しない。

## 5. エッジケース・異常系の扱い

- `planetName` に `/` や `+`、空白などを含む: `getPlanetDetail` のエンコードに委ねる。ドロワー側で追加の変換はしない。
- `404 Not Found`（一覧と詳細の不整合など）: 受け入れ基準14 のエラー表示。
- ネットワークエラー（`ApiError` status 0）: 受け入れ基準14 のエラー表示。
- レスポンスのネストオブジェクト（`orbit` / `planet` / `star` / `position`）自体は API 契約上常に存在する前提とし、欠落時の防御は行わない。
- 同じ惑星の行を再クリック: `selectedPlanetName` が変わらないため再取得は行わない（表示は維持される）。
- ドロワーを閉じた後に先行リクエストが完了: 状態を更新しない（アンマウント後の更新を行わない）。
- `NaN` / `Infinity`: API 契約上発生しないため対処しない（`docs/tasks/planet-table.md` と同様）。
- `formatDegrees` に `-0` や `-0.00001` のような丸めると0になる負値を渡した場合の符号（`-0.0000°`）: `Intl.NumberFormat` の結果に委ね、対処しない。
- テストは `StrictMode` なしで描画する前提とする（受け入れ基準10・16の「1回」は `StrictMode` 非適用時の回数）。

## 6. 未決事項

- なし。
