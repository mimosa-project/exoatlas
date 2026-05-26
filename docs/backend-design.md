# ExoAtlas バックエンド設計仕様書

## 1. 目的

本書は、ExoAtlas の FastAPI バックエンドを実装するための設計仕様を定義する。

バックエンドは `dataset/NASA_Exoplanet_Composite.csv` を主データとして読み込み、フロントエンドが必要とする惑星一覧、詳細、集計、チャート用データを JSON API として提供する。MVP ではローカル CSV をデータソースとし、将来的な DB 化やデータ更新ワークフロー追加時にも API 契約を大きく変えずに移行できる構成を目指す。

## 2. スコープ

### 2.1 MVP 対象

- CSV データ読み込み
- 欠損値の `null` 変換
- 惑星一覧 API
- 惑星詳細 API
- 発見タイムライン API
- 発見手法一覧 API
- 散布図用 API
- 天球マップ用 API
- ヘルスチェック API
- pytest によるサービス層と API の最小テスト

### 2.2 MVP 対象外

- データベース永続化
- ユーザー認証
- お気に入り保存
- CSV アップロード
- 外部 API からの自動更新
- `NASA_Exoplanet_Planetary.csv` を使った文献値比較

## 3. 技術スタック

- Python 3.12
- FastAPI
- Pandas
- Pydantic
- Uvicorn
- pytest
- Ruff
- uv

## 4. 推奨ディレクトリ構成

```text
backend/
  exoatlas_api/
    __init__.py
    main.py
    config.py
    dependencies.py
    routers/
      __init__.py
      health.py
      planets.py
      discoveries.py
      charts.py
    schemas/
      __init__.py
      common.py
      planets.py
      discoveries.py
      charts.py
    services/
      __init__.py
      dataset.py
      planets.py
      discoveries.py
      charts.py
    utils/
      __init__.py
      dataframe.py
  tests/
    test_health.py
    test_planets_api.py
    test_dataset_service.py
```

当面は既存の Streamlit 試作 `src/exoatlas/app.py` を残す。FastAPI 移行が進んだ段階で、試作を `legacy/` に移すか削除するかを判断する。

## 5. アプリケーション構成

### 5.1 レイヤー

- `main.py`
  - FastAPI アプリケーションを生成する。
  - ルーター登録、CORS、例外ハンドリングを設定する。
- `routers/`
  - HTTP エンドポイントを定義する。
  - クエリパラメータの受け取りとレスポンスモデル指定を担当する。
- `schemas/`
  - API の入出力契約を Pydantic モデルとして定義する。
- `services/`
  - CSV 読み込み、検索、絞り込み、集計、軽量データ生成を担当する。
- `utils/`
  - Pandas の欠損値変換、数値変換、ページングなどの共通処理を置く。

### 5.2 起動時のデータ読み込み

MVP では、アプリケーション起動時または初回リクエスト時に CSV を読み込み、プロセス内メモリにキャッシュする。

- データパス既定値: `dataset/NASA_Exoplanet_Composite.csv`
- 設定キー案: `EXOATLAS_COMPOSITE_CSV`
- 読み込み失敗時:
  - 起動時読み込みの場合はアプリ起動を失敗させる。
  - 初回リクエスト時読み込みの場合は `503 Service Unavailable` を返す。

MVP では実装単純性を優先し、`functools.lru_cache` または FastAPI lifespan による単一 DataFrame キャッシュを採用する。

## 6. データ設計

### 6.1 主データ

`NASA_Exoplanet_Composite.csv` を惑星単位の代表値データとして扱う。API では CSV の全列を返さず、画面要件に必要な列だけを明示的に選択する。

### 6.2 主要カラム対応

| API フィールド | CSV カラム | 型 | 用途 |
| --- | --- | --- | --- |
| `id` | `rowid` | integer | 一覧表示と React key |
| `planet_name` | `pl_name` | string | 惑星名 |
| `host_name` | `hostname` | string | 母星名 |
| `discovery_method` | `discoverymethod` | string | 発見手法 |
| `discovery_year` | `disc_year` | integer/null | 発見年 |
| `orbital_period_days` | `pl_orbper` | number/null | 公転周期 |
| `semi_major_axis_au` | `pl_orbsmax` | number/null | 軌道長半径 |
| `radius_earth` | `pl_rade` | number/null | 惑星半径 |
| `mass_earth` | `pl_bmasse` | number/null | 惑星質量 |
| `density` | `pl_dens` | number/null | 密度 |
| `equilibrium_temperature` | `pl_eqt` | number/null | 平衡温度 |
| `stellar_temperature` | `st_teff` | number/null | 恒星温度 |
| `stellar_radius` | `st_rad` | number/null | 恒星半径 |
| `stellar_mass` | `st_mass` | number/null | 恒星質量 |
| `stellar_spectral_type` | `st_spectype` | string/null | スペクトル型 |
| `right_ascension` | `ra` | number/null | 赤経 |
| `declination` | `dec` | number/null | 赤緯 |
| `distance_parsec` | `sy_dist` | number/null | 距離 |

### 6.3 欠損値

- Pandas の `NaN`、`NaT`、空文字は API レスポンスで `null` に変換する。
- JSON には `NaN` や `Infinity` を含めない。
- フロントエンドでは `null` を「未取得」として扱い、`0` と区別する。

### 6.4 型変換

- `disc_year` は可能な限り整数として扱う。
- 数値カラムは `pd.to_numeric(..., errors="coerce")` で変換する。
- 惑星名や母星名は前後空白を除去する。

## 7. API 設計

### 7.1 共通方針

- ベース URL: `/api`
- レスポンス形式: JSON
- 一覧系レスポンスは `items`, `total`, `limit`, `offset` を含む。
- クエリパラメータの不正値は `422 Unprocessable Entity` とする。
- 存在しない惑星詳細は `404 Not Found` とする。
- CSV 読み込み不能などサーバー側データ不備は `503 Service Unavailable` とする。

### 7.2 `GET /health`

API の稼働確認を返す。

レスポンス例:

```json
{
  "status": "ok"
}
```

### 7.3 `GET /api/planets`

惑星一覧をページング付きで取得する。

クエリパラメータ:

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `q` | string | なし | 惑星名または母星名の部分一致 |
| `discovery_method` | string | なし | 発見手法完全一致 |
| `disc_year_min` | integer | なし | 発見年下限 |
| `disc_year_max` | integer | なし | 発見年上限 |
| `radius_min` | number | なし | 地球半径下限 |
| `radius_max` | number | なし | 地球半径上限 |
| `mass_min` | number | なし | 地球質量下限 |
| `mass_max` | number | なし | 地球質量上限 |
| `orbital_period_min` | number | なし | 公転周期下限 |
| `orbital_period_max` | number | なし | 公転周期上限 |
| `habitable_candidate` | boolean | `false` | 簡易ハビタブル候補条件 |
| `limit` | integer | `50` | 取得件数。最大 `500` |
| `offset` | integer | `0` | 取得開始位置 |
| `sort` | string | `planet_name` | ソート対象 |
| `order` | string | `asc` | `asc` または `desc` |

レスポンス例:

```json
{
  "items": [
    {
      "id": 1,
      "planet_name": "11 Com b",
      "host_name": "11 Com",
      "discovery_method": "Radial Velocity",
      "discovery_year": 2007,
      "orbital_period_days": 326.03,
      "radius_earth": 12.1,
      "mass_earth": 6165.6,
      "distance_parsec": 93.1846
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

一覧 API の `items` はテーブル表示に必要な軽量項目に限定する。

### 7.4 `GET /api/planets/{planet_name}`

惑星詳細を取得する。`planet_name` は URL エンコードされた `pl_name` とする。

レスポンス例:

```json
{
  "id": 1,
  "planet_name": "11 Com b",
  "host_name": "11 Com",
  "discovery_method": "Radial Velocity",
  "discovery_year": 2007,
  "orbit": {
    "orbital_period_days": 326.03,
    "semi_major_axis_au": 1.29
  },
  "planet": {
    "radius_earth": 12.1,
    "mass_earth": 6165.6,
    "density": 19.1,
    "equilibrium_temperature": null
  },
  "star": {
    "stellar_temperature": 4742,
    "stellar_radius": 19,
    "stellar_mass": 2.7,
    "stellar_spectral_type": "G8 III"
  },
  "position": {
    "right_ascension": 185.1787793,
    "declination": 17.7932516,
    "distance_parsec": 93.1846
  }
}
```

### 7.5 `GET /api/discoveries/timeline`

発見年ごとの発見数を返す。

クエリパラメータ:

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `disc_year_min` | integer | なし | 発見年下限 |
| `disc_year_max` | integer | なし | 発見年上限 |
| `group_by_method` | boolean | `true` | 発見手法別に分けるか |

レスポンス例:

```json
{
  "items": [
    {
      "year": 2007,
      "discovery_method": "Radial Velocity",
      "count": 35
    }
  ]
}
```

### 7.6 `GET /api/discovery-methods`

発見手法の一覧と件数を返す。

レスポンス例:

```json
{
  "items": [
    {
      "discovery_method": "Transit",
      "count": 4200
    }
  ]
}
```

### 7.7 `GET /api/scatter/orbit-radius`

惑星半径または質量と公転周期の散布図用データを返す。

クエリパラメータ:

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `y_axis` | string | `radius` | `radius` または `mass` |
| `discovery_method` | string | なし | 発見手法 |
| `disc_year_min` | integer | なし | 発見年下限 |
| `disc_year_max` | integer | なし | 発見年上限 |

レスポンス例:

```json
{
  "items": [
    {
      "planet_name": "11 Com b",
      "host_name": "11 Com",
      "discovery_method": "Radial Velocity",
      "discovery_year": 2007,
      "orbital_period_days": 326.03,
      "radius_earth": 12.1,
      "mass_earth": 6165.6
    }
  ]
}
```

`orbital_period_days` と選択された Y 軸値が `null` の行は除外する。

### 7.8 `GET /api/sky-map`

天球マップ用の軽量データを返す。

クエリパラメータ:

| 名前 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `discovery_method` | string | なし | 発見手法 |
| `disc_year_min` | integer | なし | 発見年下限 |
| `disc_year_max` | integer | なし | 発見年上限 |
| `distance_max` | number | なし | 距離上限 |

レスポンス例:

```json
{
  "items": [
    {
      "planet_name": "11 Com b",
      "host_name": "11 Com",
      "discovery_method": "Radial Velocity",
      "discovery_year": 2007,
      "right_ascension": 185.1787793,
      "declination": 17.7932516,
      "distance_parsec": 93.1846
    }
  ]
}
```

`right_ascension` または `declination` が `null` の行は除外する。

## 8. フィルター設計

### 8.1 共通フィルター

一覧、タイムライン、散布図、天球マップで同じ意味のフィルター名を使う。

- `q`
- `discovery_method`
- `disc_year_min`
- `disc_year_max`
- `radius_min`
- `radius_max`
- `mass_min`
- `mass_max`
- `orbital_period_min`
- `orbital_period_max`

### 8.2 簡易ハビタブル候補条件

`habitable_candidate=true` の場合、以下をすべて満たす惑星を返す。

- `pl_rade` が `0.5` 以上 `2.0` 以下
- `pl_eqt` が `180` 以上 `320` 以下
- `pl_orbper` または `pl_orbsmax` が存在する

この条件は MVP 用の簡易フィルターであり、科学的な居住可能性判定ではないことを UI 側で過度に断定しない。

## 9. エラー設計

エラーレスポンスは FastAPI 標準の `detail` を基本とする。

例:

```json
{
  "detail": "Planet not found"
}
```

主なステータス:

| ステータス | 用途 |
| --- | --- |
| `200` | 正常 |
| `404` | 惑星が見つからない |
| `422` | クエリパラメータ不正 |
| `503` | CSV 不在、読み込み不能 |
| `500` | 想定外エラー |

## 10. CORS

開発時は Vite の既定ポートを許可する。

- `http://localhost:5173`
- `http://127.0.0.1:5173`

本番ビルドやデプロイ方式が決まった段階で許可オリジンを見直す。

## 11. パフォーマンス方針

- MVP では DataFrame をメモリに保持する。
- 一覧 API はページングを必須とし、既定 `limit=50`、最大 `limit=500` とする。
- チャート用 API は必要な列だけを返す。
- 初期実装では Pandas フィルタリングで十分とし、レスポンス遅延が目立つ場合に事前集計や DB 化を検討する。

## 12. テスト方針

### 12.1 サービス層

- CSV 読み込み成功
- 必須カラムの型変換
- `NaN` から `null` 相当への変換
- 惑星名検索
- 年範囲フィルター
- 簡易ハビタブル候補フィルター
- タイムライン集計

### 12.2 API

- `GET /health` が `200` を返す
- `GET /api/planets` が `items`, `total`, `limit`, `offset` を返す
- `GET /api/planets/{planet_name}` が既知惑星を返す
- 未知惑星が `404` を返す
- 不正な `limit` が `422` を返す

## 13. 実装順序

1. `backend/exoatlas_api` の最小 FastAPI 構成を作る。　-> 済
2. `GET /health` を実装する。　-> 済
3. CSV 読み込みサービスを作る。　-> 済
4. DataFrame から API フィールドへ変換する関数を作る。　-> 済
5. `GET /api/planets` を実装する。　-> 済
6. `GET /api/planets/{planet_name}` を実装する。
7. タイムライン、発見手法、散布図、天球マップ API を追加する。
8. pytest で主要 API とサービス層を検証する。
9. フロントエンドから利用する API URL と CORS を確認する。

