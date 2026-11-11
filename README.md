# ÉTERNOA : AMOUR

Talelynxで公開するオリジナル恋愛作品のギャラリー。GitHub Pagesで配信できる静的HTMLを生成します。Node.js 20以上が必要です。追加のnpm依存関係はありません。

## 確認用プレビュー

```sh
npm run dev
```

ブラウザで http://localhost:3000/ を開くと、提供済みカバー5点と作品詳細を確認できます。確認用HTMLは `.preview/` に生成されます。公開用の `docs/` には `published` の作品だけが出力されます。現在、正式なTalelynx URL待ちのため公開用の掲載は0件です。

## 作品の登録・更新

1. 正式カバーの原本を `source/covers/` に置きます。1:1の画像を使用します。追加画像は `source/gallery/<作品ID>/` に置きます。
2. `data/titles.json` に作品情報を追加します。タイトル、人物名、短い紹介文、完成カバー、Talelynxでの公開日、正式な作品URLまたは個別ルートURLを確認してから `status` を `published` にします。
3. `npm run build` を実行し、データ、画像、更新された `docs/` を同じPRに含めます。公開済み作品は公開日の新しい順に表示され、先頭がHOMEの特集になります。作品IDは詳細URLに使われるため、公開後は維持します。

| キー | 内容 |
| --- | --- |
| `id` | 重複しない半角小文字・数字・ハイフンのID |
| `title`, `characterName` | 作品名、キャラクター名。検索対象 |
| `tagline`, `summary` | キャッチコピー、短い紹介文 |
| `story`, `character`, `world`, `relationship` | 詳細本文。未入力の欄は表示されません。あらすじは `summary`、関係性は `relationships` で補えます |
| `genres`, `relationships` | 絞り込み用の文字列配列 |
| `cover` | `source/` からの画像パス。例 `covers/ashley.jpeg` |
| `gallery` | `image` と代替テキスト `alt` を持つオブジェクトの配列 |
| `talelynxUrl` | Talelynxの正式なHTTPS作品URL |
| `publishedAt`, `updatedAt` | YYYY-MM-DD。公開日はTalelynxでの公開日 |
| `status` | `published`、`coming-soon`、`private`。後者2つは公開ビルドの対象外 |
| `rating` | 任意。`all-ages` または `r18`。R18は詳細に表示され、リンクに閲覧条件の案内が付きます |

紹介文と画像は全年齢向けの素材を登録します。プレイヤー設定が可変の作品は、紹介でも可変のまま扱います。Talelynxでログイン画面や年齢確認が表示された場合は、権限のある閲覧状態で正式URLを確認します。公開用フォルダは `docs/` です。公開リポジトリの場合、ソースやPRも閲覧可能なので、未公開原稿や非公開素材は手元で管理してください。

## 更新情報

`data/news.json` に `date`（YYYY-MM-DD）、`title`、任意の `body` と `workId` を持つ項目を追加します。日付の新しい順に並び、HOMEには最新3件が表示されます。作品IDを指定した項目は、その作品が掲載対象のときに表示されます。

## 公開

レビュー承認後にPRをマージし、GitHubの **Settings → Pages → Deploy from a branch → main → /docs** を選択します。詳細ページの共有情報はビルド時に生成されます。公開後、作品ごとの詳細URLとOGP画像URLを確認してください。公開先を変更する場合は `scripts/build.mjs` の `site` を変更して再ビルドします。

## 登場人物と個別ルート

作品の `characters` に人物を配列で登録します。人物ごとの `id`（作品内で一意の半角小文字・数字・ハイフン）と `name` が必須です。任意項目は次の通りです。

| キー | 内容 |
| --- | --- |
| `profile`, `introduction`, `quote` | プロフィール、紹介文、台詞。空欄は表示されません |
| `image`, `imageAlt` | 提供済み人物画像の `source/` 相対パスと代替テキスト |
| `talelynxUrl`, `rating` | 人物ルートの正式URLと年齢区分。年齢区分の省略時は作品の値を使います |

作品詳細は `titles/<作品ID>/`、人物プロフィール兼ルート案内は `titles/<作品ID>/characters/<人物ID>/` です。作品共通のTalelynx URLは作品側に、個別ルートのURLは各人物に登録します。公開には共通URLまたは個別ルートURLが必要です。既存の `characterName` と `character` だけの作品も表示できます。検索は旧人物名欄と人物配列の名前を対象にします。

`npm run dev` で作品一覧から「単独作品｜表示サンプル」「6人作品｜表示サンプル」を開けます。サンプルのデータは `data/character-previews.json` にあり、公開ビルドには含まれません。

画像中心の人物紹介を使う作品は `characterDisplay` を `illustrations` に設定します。`characterIllustrations` に表示順で画像を登録し、各項目に `characterIds`（2人分の人物ID）、`image`（原本の相対パス）、`width` と `height`（原本のピクセル寸法）を記入します。各人物は1組だけに所属します。名前は作品一覧の検索に使われます。紹介画像は原寸画像へのリンクとしても機能します。
