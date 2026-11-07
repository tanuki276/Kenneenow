# ASTRAL ARCHIVE — Kenneenow

原神などのファンタジーアニメRPGの雰囲気を参考にした、**完全オリジナル**の3Dキャラクターギャラリーです。既存ゲームの公式3Dアセットやキャラクターは使用していません。

## 初期キャラクター
**LYRA / リラ — 星詠みの魔導士**。GLB / glTF 2.0、全身約25,000三角形、非リグ・静止ポーズ。3D回転、拡大縮小、自動回転、スクリーンショット、GLBダウンロードに対応。

## 次のキャラクターの追加
1. `public/models/next.glb` に新しいモデルを置きます。
2. `characters.json` の `characters` に新しい項目を登録し、`model` を `/models/next.glb` に設定します。
3. GitHubにpushするとVercelがデプロイし、選択画面に自動反映します。

`characters.json` の項目例:

```json
{"id":"nova","name":"NOVA","nameJa":"ノヴァ","title":"星の旅人","subtitle":"STAR TRAVELER","quote":"旅は続く。","description":"キャラの説明","element":"ASTRAL","region":"星の国","rarity":5,"model":"/models/next.glb","fileName":"next.glb","tag":"ORIGINAL · 002"}
```

## 技術
ビルド: Node.js 20以上、`npm run build`。静的サイト、Three.jsビューアー（CDN import map）、glTF 2.0 GLB。ソースは `scripts/source-bundle.br.b64`（Brotli + base64）に同梱し、`scripts/build.mjs` がビルド時に復元・生成します。初期GLBはオリジナルのパラメトリックメッシュから毎回生成され、モデル自体は`dist/models/lyra.glb`に出力されます。

手元のGLBファイルをサイトに一時読み込みすることもできます（ブラウザだけで動作し、サーバーには送信しません）。

> 非公式のファンスタイル参考作品であり、特定ゲームとは無関係です。
