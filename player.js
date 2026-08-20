// ★ URL から type を取得して表示する
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

// ★ スプレッドシート連携URL
const SHEET_URL =
"https://script.google.com/macros/s/AKfycbx56s7eC_RCqL6hFfjPH-J7I9jIVD49ti8I41liLIVYuh68Wh4FB4r3VqzgqllIrGadlA/exec";

// ★ 共有用リンク
const SHARE_URL =
  "https://riku-penguin.github.io/tankyuu-survey/";

let playerQuestions = [];
let playerIndex = 0;
let startTime = 0;
let round = 1;

let timer = null;
let preTimer = null;

let selectedOption = null;

// ★ 回答者ID
let userId = null;

// ▼▼▼ プレ画面の要素 ▼▼▼
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

// 二巡目説明画面
const secondRoundInfo = document.getElementById("secondRoundInfo");
const secondRoundOkBtn = document.getElementById("secondRoundOkBtn");

// 全画面を消す
function hideAllScreens() {
  startScreenEl.style.display = "none";
  preSituationScreen.style.display = "none";
  playerContainerEl.style.display = "none";
  infoScreenEl.style.display = "none";
  finalScreenEl.style.display = "none";
  secondRoundInfo.style.display = "none";
}

// 開始ボタン
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

function parseTime(str) {
    if (typeof str === "number") {
        return str;
    }

    const match = String(str).match(/\d+/);
    return match ? parseInt(match[0]) : 8;
}

function showPreSituation(index) {
  const q = playerQuestions[index];

  const t = parseTime(q.time);

  q.time1 = t + 2;
  q.time2 = t;

  hideAllScreens();
  preSituationScreen.style.display = "flex";

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  if (round === 2) {
    preSituationText.textContent = `${q.situation}（${q.time2}秒後から回答できます）`;
  } else {
    preSituationText.textContent = q.situation;
  }

  let remain = 5;
  preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

  if (preTimer) clearInterval(preTimer);
  preTimer = setInterval(() => {
    remain--;
    preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

    if (remain <= 0) {
      clearInterval(preTimer);
      startQuestion(index);
    }
  }, 1000);

  preOkBtn.onclick = () => {
    clearInterval(preTimer);
    startQuestion(index);
  };
}

// 質問開始
function startQuestion(index) {
  hideAllScreens();

  playerContainerEl.style.display = "block";

  selectedOption = null;
  confirmBtn.style.display = "none";

  soundStart.play();

  loadPlayerQuestion(index);
}

// 質問表示
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  optionsEl.innerHTML = "";

  const imgPlaceholder = document.createElement("div");
  imgPlaceholder.className = "optionImagePlaceholder";
  imgPlaceholder.textContent = "（ここに選択肢の画像が入ります）";
  optionsEl.appendChild(imgPlaceholder);

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
        handleTimeout(q);
        return;
      }

      timerText.textContent = `残り時間: ${Math.ceil(remaining)} 秒`;
      timerBar.style.width = `${(remaining / limit) * 100}%`;

    } else {
      timerText.textContent = `経過時間: ${Math.floor(elapsed)} 秒`;

      const unlock = q.time2;

      let width = (elapsed / unlock) * 100;
      if (width > 100) width = 100;

      timerBar.style.width = `${width}%`;
    }
  }, 50);

// A〜D の選択肢を追加
q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";

    btn.textContent = `${opt.label}（¥${opt.price}）`;
    btn.setAttribute("data-key", opt.key);

    btn.onclick = () => {
      soundClick.play();
      
      selectedOption = opt;

      document.querySelectorAll(".optionButton").forEach(b => {
        b.classList.remove("selectedOption");
      });
      btn.classList.add("selectedOption");

      confirmBtn.style.display = "block";
    };

    optionsEl.appendChild(btn);
});  // ← forEach の正しい終わり方（余計な } は不要）

// ★★★ A〜D の後に「買わない」ボタンを追加 ★★★
const noBuyBtn = document.createElement("button");
noBuyBtn.className = "optionButton noBuyButton";
noBuyBtn.textContent = "買わない";
noBuyBtn.setAttribute("data-key", "N");

// A〜D と少し離す
noBuyBtn.style.marginTop = "20px";

noBuyBtn.onclick = () => {
  soundClick.play();
  selectedOption = { key: "N", label: "買わない", price: 0 };

  document.querySelectorAll(".optionButton").forEach(b => {
    b.classList.remove("selectedOption");
  });
  noBuyBtn.classList.add("selectedOption");

  confirmBtn.style.display = "block";
};

optionsEl.appendChild(noBuyBtn);

  
// 決定ボタン
confirmBtn.onclick = () => {

  soundClick.play();
  
  const q = playerQuestions[playerIndex];

  const elapsed = (Date.now() - startTime) / 1000;

  if (round === 2 && elapsed < q.time2) {
    alert(`あと ${Math.ceil(q.time2 - elapsed)} 秒後に回答できます`);
    return;
  }

  if (!selectedOption) {
    alert("選択肢を選んでください");
    return;
  }

  if (timer) clearInterval(timer);

  const endTime = Date.now();
  const answerTime = (endTime - startTime) / 1000;

  q.selected = selectedOption.key;
  q.round = round;

  const summary = calculateSummary();
  const type = determineType(summary);

  sendToSheet({
    isUserInfo: false,
    userId,
    questionId: q.id,
    selected: selectedOption.key,
    optionLabel: selectedOption.label,
    price: selectedOption.price ?? null,
    category: q.category ?? "",
    time1: q.time1,
    time2: q.time2,
    gender: genderEl.value,
    age: ageEl.value,
    round,
    answerTime1: round === 1 ? answerTime : null,
    answerTime2: round === 2 ? answerTime : null,
    timeout: false,
    buyRate: summary.buyRate,
    noBuyRate: summary.noBuyRate,
    priceSensitivity: summary.priceSensitivity,
    impulsiveRate: summary.impulsiveRate,
    carefulRate: summary.carefulRate,
    type
  });

  nextPlayerQuestion();
};

// 一巡目の時間切れ
function handleTimeout(q) {
  soundTimeout.play();
  
  if (timer) clearInterval(timer);

  const endTime = Date.now();
  const answerTime = (endTime - startTime) / 1000;

  let selectedKey = null;
  let selectedLabel = "時間切れ";

  if (selectedOption) {
    selectedKey = selectedOption.key;
    selectedLabel = selectedOption.label;
  }

  q.selected = selectedKey;
  q.round = round;

  const summary = calculateSummary();
  const type = determineType(summary);

  sendToSheet({
    isUserInfo: false,
    userId,
    questionId: q.id,
    selected: selectedKey,
    optionLabel: selectedLabel,
    price: selectedOption ? selectedOption.price : null,
    category: q.category ?? "",
    time1: q.time1,
    time2: q.time2,
    gender: genderEl.value,
    age: ageEl.value,
    round,
    answerTime1: answerTime,
    answerTime2: null,
    timeout: true,
    buyRate: summary.buyRate,
    noBuyRate: summary.noBuyRate,
    priceSensitivity: summary.priceSensitivity,
    impulsiveRate: summary.impulsiveRate,
    carefulRate: summary.carefulRate,
    type
  });

  nextPlayerQuestion();
}

// ★★★ loadPlayerQuestion() を閉じる ★★★
}


// ▼▼▼ タイプ説明文 ▼▼▼
const typeDescriptions = {
  "せっかちタイプ（すぐ決めちゃう）":
    "あなたは『ピンときたらすぐ行動！』のタイプ。直感がとても鋭くて、迷う時間よりもワクワクを大事にする人です。",
  "心配性タイプ（慎重に考える）":
    "あなたは『じっくり考えてから動く』安心感のあるタイプ。選ぶときも、ちゃんと理由を持って決めたい人です。",
  "節約家タイプ（買わないことが多い）":
    "あなたは『本当に必要なものだけ選ぶ』しっかり者タイプ。ムダを見つけるのが上手で、賢いお金の使い方ができます。",
  "お得ハンタータイプ（コスパ重視）":
    "あなたは『値段以上の価値があるか』を見抜く名人。安いから買うのではなく、ちゃんと“良い買い物”をしたいタイプです。",
  "気分屋タイプ（状況次第で変わる）":
    "あなたは『その時の気分を大事にする』自由なタイプ。新しいものや面白いものにすぐ興味がわく、好奇心いっぱいの人です。"
};

// 次の質問へ
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
    
　　const shareUrl = `${location.origin}${location.pathname}?type=${encodeURIComponent(type)}`;
　　document.getElementById("shareLink").textContent = shareUrl;
　　document.getElementById("shareLink").href = shareUrl;
    
    const box = document.getElementById("typeDetailBox");
    box.innerHTML = "";

    const desc = typeDescriptions[type];
    const descBox = document.createElement("div");
    descBox.className = "typeDescriptionBox";
    descBox.textContent = desc;

    box.appendChild(descBox);

    setTimeout(() => {
      descBox.classList.add("show");
    }, 300);
　　
    soundResult.play();
    
    finalScreenEl.style.display = "block";
    return;
  }

  showPreSituation(playerIndex);
}

// 二巡目開始
document.getElementById("startSecondRoundBtn").addEventListener("click", () => {
  hideAllScreens();
  secondRoundInfo.style.display = "block";
});

// 二巡目説明 → スタート
secondRoundOkBtn.addEventListener("click", () => {
  round = 2;
  playerIndex = 0;

  hideAllScreens();
  showPreSituation(playerIndex);
});

// 共有リンクコピー
document.getElementById("shareBigBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(SHARE_URL);
    alert("共有用リンクをコピーしました！");
  } catch (e) {
    alert("コピーに失敗しました。\n" + SHARE_URL);
  }
});

// 傾向まとめ
function calculateSummary() {
  let buyCount = 0;
  let noBuyCount = 0;
  let total = playerQuestions.length;

  let prices = [];
  let impulsive = 0;
  let careful = 0;

  playerQuestions.forEach(q => {
    if (q.selected === "buy") buyCount++;
    if (q.selected === "no") noBuyCount++;

    if (q.selected === "buy") {
      const opt = q.options.find(o => o.key === "buy");
      if (opt) prices.push(opt.price);
    }

    if (q.round === 1 && q.selected === "buy") impulsive++;
    if (q.round === 2 && q.selected === "buy") careful++;
  });

  const buyRate = Math.round((buyCount / total) * 100);
  const noBuyRate = Math.round((noBuyCount / total) * 100);

  const avgPrice = prices.length > 0 ? prices.reduce((a,b)=>a+b)/prices.length : 0;
  const priceSensitivity = Math.max(0, Math.min(100, Math.round(100 - (avgPrice / 1000) * 100)));

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

// タイプ判定
function determineType(summary) {
  const { buyRate, noBuyRate, priceSensitivity, impulsiveRate, carefulRate } = summary;

  // 各タイプのスコア
  let scores = {
    "せっかちタイプ（すぐ決めちゃう）": 0,
    "心配性タイプ（慎重に考える）": 0,
    "節約家タイプ（買わないことが多い）": 0,
    "お得ハンタータイプ（コスパ重視）": 0,
    "気分屋タイプ（状況次第で変わる）": 0
  };

  // せっかち：衝動買いが多い
  scores["せっかちタイプ（すぐ決めちゃう）"] += impulsiveRate / 10;
  scores["せっかちタイプ（すぐ決めちゃう）"] += buyRate / 20;

  // 心配性：慎重に買う、価格に敏感
  scores["心配性タイプ（慎重に考える）"] += carefulRate / 10;
  scores["心配性タイプ（慎重に考える）"] += priceSensitivity / 20;

  // 節約家：買わない率が高い
  scores["節約家タイプ（買わないことが多い）"] += noBuyRate / 10;
  scores["節約家タイプ（買わないことが多い）"] += priceSensitivity / 30;

  // お得ハンター：価格に敏感＋買う率もそこそこ
  scores["お得ハンタータイプ（コスパ重視）"] += priceSensitivity / 15;
  scores["お得ハンタータイプ（コスパ重視）"] += buyRate / 30;

  // 気分屋：バランス型
  const balance =
    Math.abs(impulsiveRate - carefulRate) +
    Math.abs(buyRate - noBuyRate);
  scores["気分屋タイプ（状況次第で変わる）"] += (100 - balance) / 20;

  // 最もスコアが高いタイプを選ぶ
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


// 結果表を埋める
function fillResultTable(summary) {
  const table = document.getElementById("resultTable");

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

// ▼▼▼ スプレッドシート送信 ▼▼▼
async function sendToSheet(data) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error("送信エラー:", err);
  }
}
