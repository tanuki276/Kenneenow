# ASTRAL ARCHIVE — Kenneenow

幻想的なアニメRPGの世界観を参考にした、**オリジナルの3DキャラクターGLBギャラリー**です。既存ゲームのキャラクターや公式3Dアセットは使用していません。

## 第1弾のキャラクター
**LYRA / リラ — 星詠みの魔導士**。青紫の衣装、群青のロングヘア、星晶石の装飾を備えたオリジナルの全身3Dモデルです。glTF 2.0形式のGLBとして生成します。約25,256三角形、172メッシュ（現時点では非リグ、アニメーションなし）。

サイトには、ドラッグで3D回転、ホイールでズーム、自動回転、正面リセット、PNG撮影、GLBダウンロード、GLBローカルファイルの一時プレビュー機能があります。

## 新しいキャラクターを追加する

1. `public/models/your-character.glb` にGLBを追加します（フォルダがなければ作成）。
2. `characters.json` の `characters` 配列に、以下のようなキャラクター情報を追加します。
3. GitHubへpushするとVercelで再デプロイされ、キャラクター一覧から選択できるようになります。

```json
{
  "id": "nova",
  "name": "NOVA",
  "nameJa": "ノヴァ",
  "title": "星の旅人",
  "subtitle": "STAR TRAVELER",
  "quote": "旅は続く。",
  "description": "キャラクターの説明",
  "element": "ASTRAL",
  "region": "星の国",
  "rarity": 5,
  "model": "/models/your-character.glb",
  "fileName": "your-character.glb",
  "tag": "ORIGINAL · 002"
}
```

### ファイルの役割

- `index.html`: キャラクターギャラリーの画面
- `styles.css`: レスポンシブデザイン
- `app.js`: Three.js のGLB表示、モデル選択、ダウンロード、インポート
- `characters.json`: キャラクター一覧。追加すると画面に自動反映
- `scripts/generate.mjs`: 第1弾のオリジナルGLBを3D形状から自動生成
- `scripts/build.mjs`: モデルを生成し、WebファイルとGLBを `dist/` に配置
- `vercel.json`: Vercel公開設定

## ビルド

Node.js 20以上を用意し、`npm run build` を実行してください。追加のnpmパッケージは不要です。完成したサイトは `dist/` に生成され、任意の静的ホスティングで公開できます。

Three.js はブラウザ側で jsDelivr CDN を読み込みます。GLBの自動生成と配信は自分のプロジェクト内で完結します。

> 本作品は非公式のオリジナル作品で、特定のゲーム運営会社とは関係ありません。

## 2026-11 high detail upgrade
- `/models/lyra-v2.glb` — mobile viewing (81,846 triangles, ~1.7 MiB)
- `/models/lyra-studio.glb` — high-detail downloadable GLB (2,385,408 triangles, ~41.6 MiB)
- Taller 6-head-anime silhouette, sharper facial proportions, additional hair strands and embroidered costume ornaments.
- The gallery uses the compact preview while offering a separate studio-quality download.
- The source generator stays in `scripts/generate.mjs`. Build runs the enhancement recipe stored as gzip-base64 in `scripts/lyra-enhancer.gz.b64`. Multiple characters can still be registered via `characters.json`.
- A literal hundred-million-triangle GLB is not suitable for mobile browser deployment; this is a performance-conscious visual upgrade.
