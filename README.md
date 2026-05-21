# reil_st Archive

個人サイト用の静的ファイルです。

GitHub Pages で公開する場合は、このフォルダを `archive` リポジトリとして push し、Pages の公開元を `main` ブランチの root に設定します。

想定URL:

```text
https://ju-nn.github.io/archive/
```

## 投稿データの更新

`data/feeds.json` に取得元と固定 works を置き、以下で `data/feed-items.json` を再生成します。

```bash
node scripts/build-feed-data.mjs
```

GitHub Actions の `Update content` は日次または手動実行で同じ処理を行います。

## つかっているものの更新

`data/gear-data.js` を正データとして、トップページと `uses/index.html` で読み込みます。
旧URLの `gear.html` も残していますが、正規の入口は `/uses/` です。
