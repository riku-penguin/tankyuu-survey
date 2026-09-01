let remainingTime = 30;
let timerId = null;

function startReverseTimer() {
  clearInterval(timerId);

  timerId = setInterval(() => {
    remainingTime--;

    document.getElementById("timerText").textContent = remainingTime;

    if (remainingTime <= 0) {
      clearInterval(timerId);
      nextPlayerQuestion();
    }
  }, 1000);
}

// スプレッドシート連携URL
const SHEET_URL = "https://withered-dawn-9880.riku20090730.workers.dev";


// 共有用リンク（ベースURL）
const SHARE_URL = "https://riku-penguin.github.io/tankyuu-survey/";

// URLから友達の動物タイプを取得
function getFriendTypeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("friendType");
}

// URLから type を取得して表示（友達の診断結果）
const params = new URLSearchParams(location.search);
const sharedType = params.get("type");

if (sharedType) {
  const sharedBox = document.createElement("div");
  sharedBox.className = "sharedTypeBox";
  sharedBox.innerHTML = `
    <h3>あなたの友達は「${sharedType}」でした！</h3>
    <p>あなたも診断してみよう！</p>
  `;
  document.getElementById("startScreen").prepend(sharedBox);
}

// ============================
// 変数・DOM取得
// ============================

let playerQuestions = [];
let playerIndex = 0;
let currentQuestion = 0;

let startTime = 0;
let round = 1;

let timer = null;
let preTimer = null;

let selectedOption = null;

// 回答者ID
let userId = null;

// プレ画面の要素
const preSituationScreen = document.getElementById("preSituationScreen");
const preSituationText = document.getElementById("preSituationText");
const preCountdown = document.getElementById("preCountdown");
const preQuestionNumber = document.getElementById("preQuestionNumber");
const preOkBtn = document.getElementById("preOkBtn");

const genderEl = document.getElementById("playerGender");
const ageEl = document.getElementById("playerAge");

const startScreenEl = document.getElementById("startScreen");
const playerContainerEl = document.getElementById("playerContainer");
const infoScreenEl = document.getElementById("infoScreen");
const finalScreenEl = document.getElementById("finalScreen");

const situationEl = document.getElementById("playerSituation");
const questionEl = document.getElementById("playerQuestion");
const optionsEl = document.getElementById("playerOptions");

const timerText = document.getElementById("timerText");
const timerBar = document.getElementById("timerBar");
const questionNumber = document.getElementById("questionNumber");

const confirmBtn = document.getElementById("confirmBtn");

// 質問画像
const questionImageEl = document.getElementById("questionImage");

// 二巡目説明画面
const secondRoundInfo = document.getElementById("secondRoundInfo");
const secondRoundOkBtn = document.getElementById("secondRoundOkBtn");

// 結果画面用
const mainAnimalImg = document.getElementById("mainAnimalImg");
const shareTextEl = document.getElementById("shareText");

// ============================
// 画面切り替え
// ============================

function hideAllScreens() {
  startScreenEl.style.display = "none";
  preSituationScreen.style.display = "none";
  playerContainerEl.style.display = "none";
  infoScreenEl.style.display = "none";
  finalScreenEl.style.display = "none";
  secondRoundInfo.style.display = "none";
}

// ============================
// スプレッドシート送信
// ============================

async function sendToSheet(data) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error("送信エラー:", err);
  }
}


// ============================
// 開始ボタン
// ============================

document.getElementById("startBtn").addEventListener("click", async () => {
  if (!genderEl.value || !ageEl.value) {
    alert("性別と年齢を入力してください");
    return;
  }

  userId = "user_" + Date.now();

  sendToSheet({
    isUserInfo: true,
    userId,
    gender: genderEl.value,
    age: ageEl.value
  });

  const res = await fetch("questions.json");
  const data = await res.json();

  playerQuestions = data.questions;
  playerIndex = 0;
  round = 1;

  startScreenEl.style.display = "none";

  showPreSituation(playerIndex);
});

// ============================
// 時間文字列 → 数値変換
// ============================

function parseTime(str) {
  if (typeof str === "number") return str;
  const match = String(str).match(/\d+/);
  return match ? parseInt(match[0]) : 8;
}

// ============================
// プレ画面表示
// ============================

function showPreSituation(index) {
  const q = playerQuestions[index];

  const t = parseTime(q.time);
  q.time1 = t + 2; // 一巡目の制限時間
  q.time2 = t;     // 二巡目の「解禁までの時間」

  hideAllScreens();
  preSituationScreen.style.display = "flex";

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  // ★ 二巡目は「◯秒後から回答できます」と表示
  if (round === 2) {
    preSituationText.textContent = `${q.situation}（${q.time2}秒後から回答できます）`;
  } else {
    preSituationText.textContent = q.situation;
  }

  // ★ 5秒後に質問画面へ移行（1巡目も2巡目も共通）
  let remain = 5;
  preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

  if (preTimer) clearInterval(preTimer);
  preTimer = setInterval(() => {
    remain--;
    preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

    if (remain <= 0) {
      clearInterval(preTimer);
      startQuestion(index);  // ← 二巡目もここで質問画面へ
    }
  }, 1000);

  // ★ OKボタンでも即質問画面へ
  preOkBtn.onclick = () => {
    clearInterval(preTimer);
    startQuestion(index);
  };
}


// ============================
// 質問開始
// ============================

function startQuestion(index) {
  hideAllScreens();
  playerContainerEl.style.display = "block";

  currentQuestion = index;
  selectedOption = null;
  confirmBtn.style.display = "none";

  loadPlayerQuestion(index);
}

// ============================
// 質問表示
// ============================

function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  if (q.image) {
    questionImageEl.src = q.image;
    questionImageEl.style.display = "block";
  } else {
    questionImageEl.style.display = "none";
  }

  optionsEl.innerHTML = "";

  startTime = Date.now();
  let limit = round === 1 ? q.time1 : q.time2;

  if (timer) clearInterval(timer);
  timer = null;

  timerBar.style.width = round === 1 ? "100%" : "0%";
  timerText.textContent =
    round === 1 ? `残り時間: ${limit} 秒` : `経過時間: 0 秒`;

  timer = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;

    if (round === 1) {
      const remaining = limit - elapsed;

      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
      
          nextPlayerQuestion();
        return;
      }

      timerText.textContent = `残り時間: ${Math.ceil(remaining)} 秒`;
      timerBar.style.width = `${(remaining / limit) * 100}%`;

    } else {
      // ★ 二巡目：経過時間表示
      timerText.textContent = `経過時間: ${Math.floor(elapsed)} 秒`;

      const unlock = q.time2;
      let width = (elapsed / unlock) * 100;
      if (width > 100) width = 100;

      timerBar.style.width = `${width}%`;

      // ★ 二巡目：解禁時間を過ぎたら回答可能にする
      if (elapsed >= unlock) {
        confirmBtn.style.display = "block";
      }
    }
  }, 50);

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.textContent = `${opt.label}（¥${opt.price}）`;
    btn.setAttribute("data-key", opt.key);

    btn.onclick = () => {
      selectedOption = { key: opt.key, label: opt.label, price: opt.price };

      document.querySelectorAll(".optionButton").forEach(b => {
        b.classList.remove("selectedOption");
      });
      btn.classList.add("selectedOption");

      confirmBtn.style.display = "block";
    };

    optionsEl.appendChild(btn);
  });

  const noBuyBtn = document.createElement("button");
  noBuyBtn.className = "optionButton noBuyButton";
  noBuyBtn.textContent = "買わない";
  noBuyBtn.setAttribute("data-key", "N");

  noBuyBtn.onclick = () => {
    selectedOption = { key: "N", label: "買わない", price: 0 };

    document.querySelectorAll(".optionButton").forEach(b => {
      b.classList.remove("selectedOption");
    });
    noBuyBtn.classList.add("selectedOption");

    confirmBtn.style.display = "block";
  };

  optionsEl.appendChild(noBuyBtn);
}

// ============================
// 決定ボタン
// ============================

confirmBtn.onclick = () => {
  if (!selectedOption) return;

  const q = playerQuestions[currentQuestion];
  const now = Date.now();
  const elapsed = (now - startTime) / 1000;

  const data = {
    userId,
    questionId: q.id || currentQuestion + 1,
    selected: selectedOption.key,
    optionLabel: selectedOption.label,
    price: selectedOption.price,
    category: q.category || null,
    time1: q.time1 || null,
    time2: q.time2 || null,
    gender: genderEl.value,
    age: ageEl.value,
    round,
    answerTime1: round === 1 ? elapsed : null,
    answerTime2: round === 2 ? elapsed : null,
    timeout: selectedOption.key === "N",
    buyRate: null,
    noBuyRate: null,
    priceSensitivity: null,
    impulsiveRate: null,
    carefulRate: null,
    type: null
  };

  sendToSheet(data);

  playerQuestions[currentQuestion].selected = selectedOption.key;
  playerQuestions[currentQuestion].round = round;

  nextPlayerQuestion();
};

// ============================
// 次の質問へ
// ============================

function nextPlayerQuestion() {
  hideAllScreens();
  playerIndex++;

  if (round === 1 && playerIndex >= playerQuestions.length) {
    infoScreenEl.style.display = "block";
    return;
  }

  if (round === 2 && playerIndex >= playerQuestions.length) {
    const summary = calculateSummary();
    fillResultTable(summary);

    const type = determineType(summary);
    document.getElementById("resultType").textContent = `あなたのタイプ：${type}`;

    const box = document.getElementById("typeDetailBox");
    box.innerHTML = document.getElementById("pairTableBox").innerHTML;

    finalScreenEl.style.display = "block";
    return;
  }

  showPreSituation(playerIndex);
}



document.getElementById("startSecondRoundBtn").addEventListener("click", () => {
  hideAllScreens();
  secondRoundInfo.style.display = "block";
});

document.getElementById("secondRoundOkBtn").addEventListener("click", () => {
  round = 2;
  playerIndex = 0;

  hideAllScreens();
  showPreSituation(playerIndex);
});

// ============================
// 結果表を埋める
// ============================

function fillResultTable(summary) {
  const table = document.getElementById("resultTable");
  if (!table) return;

  table.innerHTML = "";

  const rows = [
    ["買う傾向", summary.buyRate],
    ["節約傾向", summary.noBuyRate],
    ["値段への敏感度", summary.priceSensitivity],
    ["衝動買い度（一巡目）", summary.impulsiveRate],
    ["慎重度（二巡目）", summary.carefulRate]
  ];

  rows.forEach(([label, value]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${label}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${value}%</td>
    `;
    table.appendChild(tr);
  });
}

// ============================
// 傾向まとめ
// ============================

function calculateSummary() {
  let prices = [];
  let impulsive = 0;
  let careful = 0;

  let buyCount = 0;
  let noBuyCount = 0;
  let total = playerQuestions.length;

  playerQuestions.forEach(q => {
    if (["A", "B", "C", "D"].includes(q.selected)) buyCount++;
    if (q.selected === "N") noBuyCount++;

    if (q.selected) {
      const opt = q.options.find(o => o.key === q.selected);
      if (opt && opt.price != null) prices.push(opt.price);
    }

    if (q.round === 1 && ["A","B","C","D"].includes(q.selected)) impulsive++;
    if (q.round === 2 && ["A","B","C","D"].includes(q.selected)) careful++;
  });

  const buyRate = Math.round((buyCount / total) * 100);
  const noBuyRate = Math.round((noBuyCount / total) * 100);

  const avgPrice = prices.length > 0
    ? prices.reduce((a,b)=>a+b)/prices.length
    : 0;

  const priceSensitivity = Math.max(0, Math.min(100,
    Math.round(100 - (avgPrice / 1000) * 100)
  ));

  const impulsiveRate = Math.round((impulsive / total) * 100);
  const carefulRate = Math.round((careful / total) * 100);

  return {
    buyRate,
    noBuyRate,
    priceSensitivity,
    impulsiveRate,
    carefulRate
  };
}

// ============================
// タイプ判定
// ============================

function determineType(summary) {
  const { buyRate, noBuyRate, priceSensitivity, impulsiveRate, carefulRate } = summary;

  let scores = {
    "せっかちタイプ（すぐ決めちゃう）": 0,
    "心配性タイプ（慎重に考える）": 0,
    "節約家タイプ（買わないことが多い）": 0,
    "お得ハンタータイプ（コスパ重視）": 0,
    "気分屋タイプ（状況次第で変わる）": 0
  };

  scores["せっかちタイプ（すぐ決めちゃう）"] += impulsiveRate / 10;
  scores["せっかちタイプ（すぐ決めちゃう）"] += buyRate / 20;

  scores["心配性タイプ（慎重に考える）"] += carefulRate / 10;
  scores["心配性タイプ（慎重に考える）"] += priceSensitivity / 20;

  scores["節約家タイプ（買わないことが多い）"] += noBuyRate / 10;
  scores["節約家タイプ（買わないことが多い）"] += priceSensitivity / 30;

  scores["お得ハンタータイプ（コスパ重視）"] += priceSensitivity / 15;
  scores["お得ハンタータイプ（コスパ重視）"] += buyRate / 30;

  const balance =
    Math.abs(impulsiveRate - carefulRate) +
    Math.abs(buyRate - noBuyRate);
  scores["気分屋タイプ（状況次第で変わる）"] += (100 - balance) / 20;

  let bestType = null;
  let bestScore = -Infinity;

  for (const type in scores) {
    if (scores[type] > bestScore) {
      bestScore = scores[type];
      bestType = type;
    }
  }

  return bestType;
}

// ============================
// タイプ説明文
// ============================

const typeDescriptions = {
  "せっかちタイプ（すぐ決めちゃう）":
    "あなたは『ピンときたらすぐ行動！』のタイプ。直感が鋭く、迷うよりワクワクを大事にする人です。",
  "心配性タイプ（慎重に考える）":
    "あなたは『じっくり考えてから動く』安心感のあるタイプ。選ぶときも理由を持って決めたい人です。",
  "節約家タイプ（買わないことが多い）":
    "あなたは『本当に必要なものだけ選ぶ』しっかり者タイプ。ムダを見つけるのが上手です。",
  "お得ハンタータイプ（コスパ重視）":
    "あなたは『値段以上の価値があるか』を見抜く名人。安いから買うのではなく、良い買い物をしたいタイプです。",
  "気分屋タイプ（状況次第で変わる）":
    "あなたは『その時の気分を大事にする』自由なタイプ。新しいものにすぐ興味がわく好奇心いっぱいの人です。"
};

// ============================
// 動物タイプ変換
// ============================

function convertToAnimalType(myType) {
  if (myType.includes("せっかち")) return "usagi";
  if (myType.includes("心配性")) return "fuku";
  if (myType.includes("節約家")) return "ham";
  if (myType.includes("お得ハンター")) return "kitsune";
  if (myType.includes("気分屋")) return "neko";
  return null;
}

// ============================
// 相性データ（25種類）
// ============================

const pairData = {
  "usagi_usagi": { score: 70, text: "テンポが似ていて行動が早い同士。気が合いやすい組み合わせ。", advice: "お互い急ぎすぎるとすれ違うので、少しだけゆっくり話すと◎。", yourImg: "images/usagi.png", otherImg: "images/usagi.png" },
  "usagi_fuku": { score: 65, text: "せっかち×慎重でバランスが良い。お互いの弱点を補える関係。", advice: "ウサギが少しだけ待つ姿勢を見せると、フクロウが安心する。", yourImg: "images/usagi.png", otherImg: "images/fuku.png" },
  "usagi_ham": { score: 68, text: "せっかち×節約家でテンポは違うが、目的が合えば強い組み合わせ。", advice: "ウサギが焦らず説明すると、ハムスターが安心して決断できる。", yourImg: "images/usagi.png", otherImg: "images/ham.png" },
  "usagi_kitsune": { score: 72, text: "行動力×合理性でテンポが合う。話が早くて相性良し。", advice: "ウサギが理由を伝えると、キツネがもっと動きやすくなる。", yourImg: "images/usagi.png", otherImg: "images/kitsune.png" },
  "usagi_neko": { score: 80, text: "せっかち×気分屋でテンポが噛み合う。自然体で仲良くなれる。", advice: "ネコの気ままさを尊重すると、さらに良い関係に。", yourImg: "images/usagi.png", otherImg: "images/neko.png" },

  "fuku_usagi": { score: 65, text: "慎重×せっかちで補い合う関係。落ち着きと行動力の良い組み合わせ。", advice: "フクロウがペースを少し合わせると、ウサギが安心する。", yourImg: "images/fuku.png", otherImg: "images/usagi.png" },
  "fuku_fuku": { score: 75, text: "慎重同士で安心できる関係。ゆっくり丁寧に進むタイプ。", advice: "話し合いを増やすとさらに信頼が深まる。", yourImg: "images/fuku.png", otherImg: "images/fuku.png" },
  "fuku_ham": { score: 78, text: "慎重×節約家で価値観が似ている。堅実で安心できる組み合わせ。", advice: "お互いの不安を共有するとさらに強い絆に。", yourImg: "images/fuku.png", otherImg: "images/ham.png" },
  "fuku_kitsune": { score: 68, text: "慎重×合理で相性が良い。お互いの判断が噛み合う。", advice: "キツネが急ぎすぎないと、フクロウがもっと動きやすい。", yourImg: "images/fuku.png", otherImg: "images/kitsune.png" },
  "fuku_neko": { 
    score: 60,
    text: "慎重×気分屋でペース差が出やすい組み合わせ。",
    advice: "ネコが一言だけ気持ちを伝えると、フクロウが安心する。",
    yourImg: "images/fuku.png",
    otherImg: "images/neko.png"
  },

  "ham_usagi": { score: 68, text: "節約家×せっかちでテンポは違うが、目的が合えば強い組み合わせ。", advice: "ウサギが焦らず説明すると、ハムスターが安心して決断できる。", yourImg: "images/ham.png", otherImg: "images/usagi.png" },
  "ham_fuku": { score: 78, text: "節約家×慎重で価値観が似ている。堅実で安心できる組み合わせ。", advice: "お互いの不安を共有するとさらに強い絆に。", yourImg: "images/ham.png", otherImg: "images/fuku.png" },
  "ham_ham": { score: 80, text: "節約家同士で相性抜群。無駄を嫌う価値観が一致している。", advice: "たまにはご褒美を許すと関係が明るくなる。", yourImg: "images/ham.png", otherImg: "images/ham.png" },
  "ham_kitsune": { score: 70, text: "節約家×合理で相性が良い。効率重視の価値観が合う。", advice: "キツネが理由を丁寧に伝えると、ハムスターが安心する。", yourImg: "images/ham.png", otherImg: "images/kitsune.png" },
  "ham_neko": { score: 62, text: "節約家×気分屋で価値観がズレやすい組み合わせ。", advice: "ネコが自由さの理由を伝えると、ハムスターが理解しやすい。", yourImg: "images/ham.png", otherImg: "images/neko.png" },

  "kitsune_usagi": { score: 72, text: "合理×行動力でテンポが良い。決断が早くて相性良し。", advice: "ウサギが理由を伝えると、キツネがもっと安心して動ける。", yourImg: "images/kitsune.png", otherImg: "images/usagi.png" },
  "kitsune_fuku": { score: 68, text: "合理×慎重で相性が良い。お互いの判断が噛み合う。", advice: "キツネが急ぎすぎないと、フクロウがもっと動きやすい。", yourImg: "images/kitsune.png", otherImg: "images/fuku.png" },
  "kitsune_ham": { score: 70, text: "合理×節約家で価値観が合う。効率重視の相性。", advice: "キツネが丁寧に説明すると、ハムスターが安心する。", yourImg: "images/kitsune.png", otherImg: "images/ham.png" },
  "kitsune_kitsune": { score: 75, text: "合理同士で話が早い。効率重視の相性。", advice: "柔軟性を少し持つとさらに良い関係に。", yourImg: "images/kitsune.png", otherImg: "images/kitsune.png" },
  "kitsune_neko": { score: 62, text: "合理×気分屋でズレが出やすい組み合わせ。", advice: "キツネが柔らかく接すると、ネコが安心して動ける。", yourImg: "images/kitsune.png", otherImg: "images/neko.png" },

  "neko_usagi": { score: 80, text: "気分屋×せっかちでテンポが合う。自然体で仲良くなれる。", advice: "ウサギが急ぎすぎないと、ネコがもっと安心する。", yourImg: "images/neko.png", otherImg: "images/usagi.png" },

  "neko_fuku": { 
    score: 60,
    text: "気分屋×慎重でペース差が出やすい組み合わせ。",
    advice: "ネコが一言だけ気持ちを伝えると、フクロウが安心する。",
    yourImg: "images/neko.png",
    otherImg: "images/fuku.png"
  },

  "neko_ham": {
    score: 62,
    text: "気分屋×節約家で価値観がズレやすい組み合わせ。",
    advice: "ネコが自由さの理由を伝えると、ハムスターが理解しやすい。",
    yourImg: "images/neko.png",
    otherImg: "images/ham.png"
  },

  "neko_kitsune": {
    score: 62,
    text: "気分屋×合理でズレが出やすい組み合わせ。",
    advice: "キツネが柔らかく接すると、ネコが安心して動ける。",
    yourImg: "images/neko.png",
    otherImg: "images/kitsune.png"
  },

  "neko_neko": {
    score: 70,
    text: "気分屋同士で楽しい関係。自由でゆるい雰囲気が合う。",
    advice: "お互いの気ままさを尊重するとさらに良い。",
    yourImg: "images/neko.png",
    otherImg: "images/neko.png"
  }
};

// ============================
// 相性表示
// ============================

function showPairResult(key) {
  const data = pairData[key];
  if (!data) return;

  const pairScoreEl = document.getElementById("pair-score");
  const pairScoreTextEl = document.getElementById("pair-score-text");
  const pairDescEl = document.getElementById("pair-desc");
  const yourImgEl = document.getElementById("yourPairImg");
  const otherImgEl = document.getElementById("otherPairImg");
  const pairResultEl = document.getElementById("pairResult");

  if (!pairResultEl) return;

  if (pairScoreEl) pairScoreEl.textContent = `${data.score}点`;
  if (pairScoreTextEl) pairScoreTextEl.textContent = `${data.scoreText}`;

  if (pairDescEl) {
    pairDescEl.innerHTML =
      `${data.text}<br><br><strong>こうすれば上手くいく：</strong>${data.advice}`;
  }

  if (yourImgEl) yourImgEl.src = data.yourImg;
  if (otherImgEl) otherImgEl.src = data.otherImg;

  pairResultEl.style.display = "block";
}

