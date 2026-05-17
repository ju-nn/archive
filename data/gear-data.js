(function (root) {
  const data = {
    associateTag: "jun076-22",
    featuredIds: ["ricoh-gr-iiix", "codex-app", "stan-rice-cooker", "sp500"],
    categories: [
      { id: "life", title: "暮らしの道具", summary: "日々の負担を減らして、生活の土台を整えるもの。", symbol: "暮", tone: "sun" },
      { id: "making", title: "制作の道具", summary: "思いつきをその日のうちに形にするための相棒。", symbol: "作", tone: "sky" },
      { id: "photo-vlog", title: "写真・Vlogの道具", summary: "歩きながらの記録を少しだけ映像っぽくするもの。", symbol: "撮", tone: "mint" },
      { id: "creature-care", title: "生きものの道具", summary: "2匹の猫と1匹のリクガメとの暮らしに必要なもの。", symbol: "生", tone: "leaf" },
      { id: "wear", title: "服・身につけるもの", summary: "迷う時間を減らして、気分を整えるもの。", symbol: "着", tone: "sand" },
      { id: "money-exit", title: "お金・逃げ道の道具", summary: "働きすぎない未来のために、静かに備えるもの。", symbol: "逃", tone: "rose" }
    ],
    items: [
      { id: "muji-bed", category: "life", kind: "product", name: "無印のベッド", note: "よく眠るための、暮らしの土台。", amazonSearch: "無印良品 もたれかかれる木製ベッド オーク材突板 シングル" },
      { id: "panasonic-microwave", category: "life", kind: "product", name: "パナソニック 電子レンジ", note: "フラットテーブルで、日々のあたためをさっと片づける。", amazonSearch: "パナソニック 電子レンジ 22L 大容量 スタンダードモデル スピードあたため フラットテーブル 22L 新生活 ヘルツフリー ホワイト NE-FL1C-W" },
      { id: "nitori-washer-dryer", category: "life", kind: "product", name: "ニトリのドラム式洗濯乾燥機", note: "洗濯と乾燥をまとめて、暮らしの手間を軽くする。", amazonSearch: "ニトリ ドラム式洗濯乾燥機" },
      { id: "stan-rice-cooker", category: "life", kind: "product", name: "STAN. 炊飯器", note: "自炊のハードルを下げてくれる生活インフラ。", amazonSearch: "STAN 炊飯器", featured: true },
      { id: "dishwasher", category: "life", kind: "product", name: "食洗機", note: "毎日の小さな消耗を、そっと肩代わりしてくれる道具。", amazonSearch: "食洗機" },
      { id: "drip-oneger", category: "life", kind: "product", name: "drip oneger", note: "服を整えて、着る時間の気分をそろえるハンガー。", amazonSearch: "drip oneger" },
      { id: "windows-pc", category: "making", kind: "product", name: "Windows PC", note: "ASUS ゲーミングノートPC TUF Gaming A14.", amazonSearch: "ASUS TUF Gaming A14" },
      { id: "codex-app", category: "making", kind: "service", name: "Codex App", note: "作りたいものを、形にするための相棒。", featured: true },
      { id: "github-account", category: "making", kind: "service", name: "GitHub", note: "自分のコードや制作物を置いている場所。", url: "https://github.com/ju-nn", linkLabel: "GitHubを見る" },
      { id: "iphone", category: "photo-vlog", kind: "product", name: "iPhone 15 Pro", note: "いちばん身近なカメラで、日々の断片を拾う。", amazonSearch: "iPhone 15 Pro" },
      { id: "ricoh-gr-iiix", category: "photo-vlog", kind: "product", name: "RICOH GR IIIx", note: "小さくて、日常を持ち歩けるカメラ。", amazonSearch: "RICOH GR IIIx", featured: true },
      { id: "fujifilm-x-e4", category: "photo-vlog", kind: "product", name: "FUJIFILM X-E4", note: "撮る時間そのものを楽しみたくなるカメラ。", amazonSearch: "FUJIFILM X-E4" },
      { id: "osmo-pocket-3", category: "photo-vlog", kind: "product", name: "Osmo Pocket 3", note: "歩きながらの記録を、少し映画っぽくしてくれる小さなカメラ。", amazonSearch: "Osmo Pocket 3" },
      { id: "blackmagic-camera", category: "photo-vlog", kind: "service", name: "Blackmagic Camera", note: "動画はこれで撮る、見た目も使い心地も好きな撮影アプリ。", url: "https://www.blackmagicdesign.com/jp/products/blackmagiccamera", linkLabel: "公式を見る" },
      { id: "dazz-cam", category: "photo-vlog", kind: "service", name: "Dazz Cam", note: "スマホ写真に、少しだけ記憶っぽい質感を足すアプリ。", url: "https://dazzcam.app/", linkLabel: "公式を見る" },
      { id: "nekoya-clipper", category: "creature-care", kind: "product", name: "猫壱 爪切り", note: "猫の爪切り、寝てるときしかうまくできない。", amazonSearch: "猫壱 爪切り" },
      { id: "nekoya-water-bowl", category: "creature-care", kind: "product", name: "猫壱 ウォーターボウル", note: "猫の水皿。あんまりつかってくれない。", amazonSearch: "猫壱 ハッピーダイニング 猫用 脚付ウォーターボウル" },
      { id: "nekoya-food-bowl", category: "creature-care", kind: "product", name: "猫壱 フードボウル", note: "猫のごはん皿。３時間に一度おねだりされる。", amazonSearch: "猫壱 ハッピーダイニング 脚付フードボウル" },
      { id: "science-diet-cat-food", category: "creature-care", kind: "product", name: "サイエンスダイエット キャットフード", note: "おねだりが多いので、小分けにあげいてる。", amazonSearch: "サイエンスダイエット キャットフード" },
      { id: "apple-watch", category: "wear", kind: "product", name: "Apple Watch", note: "ほぼアラーム用になっているけれど、生活のリズムを整えてくれる。", amazonSearch: "Apple Watch" },
      { id: "airpods", category: "wear", kind: "product", name: "Apple AirPods Pro 3", note: "移動時間や散歩を、自分の部屋みたいにする道具。", amazonSearch: "Apple AirPods Pro 3" },
      { id: "ipad-mini-6", category: "wear", kind: "product", name: "iPad mini 6", note: "読む・見る・メモするを軽くまとめて持ち歩けるタブレット。", amazonSearch: "iPad mini 6" },
      { id: "batoner-knit", category: "wear", kind: "product", name: "BATONER SIGNATURE DRIVERS KNIT", note: "寒くなると、このドライバーズニットを着る。", amazonSearch: "BATONER ドライバーズニット" },
      { id: "marka-shirt-coat", category: "wear", kind: "product", name: "marka SHIRT COAT", note: "薄手のコート。年中着てる。", amazonSearch: "marka シャツコート" },
      { id: "on-cloudmonster", category: "wear", kind: "product", name: "On Cloudmonster", note: "歩く時間を、そのまま気分よく連れていくスニーカー。", amazonSearch: "On Cloudmonster" },
      { id: "ou-at-bag", category: "wear", kind: "product", name: "OUAT OFFICE BAG", note: "その日の持ちものを、ちょうどよく運ぶための相棒。", url: "https://www.ou-at.com/items/64826832", linkLabel: "公式を見る" },
      { id: "sp500", category: "money-exit", kind: "asset", name: "S&P500", note: "働きすぎない未来のための、静かな逃げ道。", featured: true },
      { id: "semi-retire-simulator", category: "money-exit", kind: "service", name: "セミリタイア資金シミュレーター", note: "逃げ道までの距離を、ぼんやりではなく測るためのもの。", url: "https://ju-nn.github.io/Jiyu-Compass/", linkLabel: "サイトを見る" }
    ]
  };

  if (root && typeof root === "object") {
    root.__GEAR_DATA__ = data;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = data;
  }
})(typeof window !== "undefined" ? window : globalThis);
