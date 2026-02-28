# AIChecker

Easy Discord Bot Builder (EDBB) のための AI コードレビュープラグインです。
WebLLM を使用して、Google の **Gemma 2 2B** モデルをブラウザ内でローカルに実行します。

## ✨ 特徴

- **完全ローカル実行**: コードが外部サーバーに送信されることはありません。プライバシーが守られます。
- **無料・無制限**: Gemini API などの外部 API キーは不要です。
- **Gemma 2 2B 搭載**: Google の高性能な軽量モデルにより、的確なコードレビューを行います。
- **ディスク容量に優しい**: 内蔵 AI (Gemini Nano) のような厳しいディスク空き容量制限（25GB以上）がありません。

## 🚀 インストール方法

1.  [Easy Discord Bot Builder](https://edbplugin.github.io/easy-bdp/) を開きます。
2.  「プラグイン」ボタンをクリックします。
3.  「GitHubで探す」タブで `AIChecker` を検索するか、以下のインストールURLをブラウザに貼り付けます：
    `https://edbplugin.github.io/easy-bdp/editor/index.html?install-plugin=yuta25912/AIChecker`

## 🛠️ 使い方

1. 画面上部の「AIレビュー」ボタンをクリックします。
2. チャット形式で質問を入力します（例：「このコードのバグを教えて」「もっと効率的にして」）。
3. **初回実行時のみ**: AIモデル（約1.5GB）のダウンロードが始まります。進捗バーが表示されるので、完了までお待ちください。
4. ダウンロード完了後、AI があなたのコードを読み取り、アドバイスを返します。

## 📋 動作要件

- **WebGPU 対応ブラウザ**: 最新の Google Chrome (デスクトップ版) を推奨します。
- **GPU**: Apple M1/M2/M3 チップの Mac、または NVIDIA/AMD GPU 搭載の PC。
- **メモリ**: 8GB 以上の RAM (推奨)。

## 👨‍💻 開発者

- **yuta25912**

## 📄 ライセンス

MIT License
