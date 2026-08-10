// ★ スプレッドシート連携URL
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwSR1KwEpJQLQItAJvvB0Y1wY2orXNpK2-9d1RPQ7nF-kNDK3XVgYvBjz49d-vRUy2nuQ/exec";

// ★ 共有用リンク
const SHARE_URL =
  "https://docs.google.com/spreadsheets/d/19lLmoS2wiBFxPY-nFQi7NQMLsSJQGNoWNeIbjqEITX4/edit?gid=0";

let playerQuestions = [];
let playerIndex = 0;
let startTime = 0;
let round = 1;

let timer = null;
let preTimer = null;

let selectedOption = null;

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

  // ★ 回答者IDを作成
  userId = "user_" + Date.now();

  // ★ 回答者情報を最初に送信
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


  const res = await fetch("questions.json");
  const data = await res.json();

  playerQuestions = data.questions;
  playerIndex = 0;
  round = 1;

  startScreenEl.style.display = "none";

  showPreSituation(playerIndex);
});

// time の自動変換
function parseTime(str) {
  if (!str) return { t1: 10, t2: 10 };

  const nums = str.match(/\d+/g);
  if (!nums) return { t1: 10, t2: 10 };

  if (nums.length === 1) {
    const t = parseInt(nums[0]);
    return { t1: t, t2: t };
  }

  return { t1: parseInt(nums[0]), t2: parseInt(nums[1]) };
}

// プレ画面表示
function showPreSituation(index) {
  const q = playerQuestions[index];

  const { t1, t2 } = parseTime(q.time);

  q.time1 = t1 + 2;
  q.time2 = t2;

  hideAllScreens();
  preSituationScreen.style.display = "flex";

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  // ★ 二巡目は状況文に「◯秒後から回答できます」を追加
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

    // ▼▼▼ 一巡目 ▼▼▼
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

      const ratio = remaining / limit;
      if (ratio > 0.7) timerBar.style.background = "#8bc34a";
      else if (ratio > 0.4) timerBar.style.background = "#fdd835";
      else if (ratio > 0.2) timerBar.style.background = "#fb8c00";
      else timerBar.style.background = "#e53935";

    // ▼▼▼ 二巡目（修正版） ▼▼▼
    } else {
      timerText.textContent = `経過時間: ${Math.floor(elapsed)} 秒`;

      const unlock = q.time2;

      let width = (elapsed / unlock) * 100;
      if (width > 100) width = 100;

      timerBar.style.width = `${width}%`;

      const ratio = width / 100;

      const r = Math.floor(207 + (144 - 207) * ratio);
      const g = Math.floor(216 + (202 - 216) * ratio);
      const b = Math.floor(220 + (249 - 220) * ratio);

      timerBar.style.background = `rgb(${r}, ${g}, ${b})`;
    }
  }, 50);

  // ▼▼▼ 選択肢ボタン ▼▼▼
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";

    btn.textContent = `${opt.label}（¥${opt.price}）`;
    btn.setAttribute("data-key", opt.key);

    btn.onclick = () => {
      selectedOption = opt;

      document.querySelectorAll(".optionButton").forEach(b => {
        b.classList.remove("selectedOption");
      });
      btn.classList.add("selectedOption");

      confirmBtn.style.display = "block";
    };

    optionsEl.appendChild(btn);
  });
}

// 決定ボタン
confirmBtn.onclick = () => {
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
    isUserInfo: false,   // ★追加
    userId,              // ★追加

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
    isUserInfo: false,   // ★追加
    userId,              // ★追加

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


// ▼▼▼ タイプ説明文（詳しい版） ▼▼▼
const typeDescriptions = {
  "せっかちタイプ（すぐ決めちゃう）":
    "あなたは『ピンときたらすぐ行動！』のタイプ。直感がとても鋭くて、迷う時間よりもワクワクを大事にする人です。あなたのスピード感は魅力そのもの。たまに勢いで決めちゃうこともあるけれど、それもあなたらしさです。",

  "心配性タイプ（慎重に考える）":
    "あなたは『じっくり考えてから動く』安心感のあるタイプ。選ぶときも、ちゃんと理由を持って決めたい人です。周りからは落ち着いていて信頼できる存在と思われています。ゆっくりでも、あなたの選択はいつも丁寧です。",

  "節約家タイプ（買わないことが多い）":
    "あなたは『本当に必要なものだけ選ぶ』しっかり者タイプ。ムダを見つけるのが上手で、賢いお金の使い方ができます。長い目で見て行動できるので、将来の計画も立てやすい人です。",

  "お得ハンタータイプ（コスパ重視）":
    "あなたは『値段以上の価値があるか』を見抜く名人。安いから買うのではなく、ちゃんと“良い買い物”をしたいタイプです。周りから「買い物上手だね」と言われることも多いはず。",

  "気分屋タイプ（状況次第で変わる）":
    "あなたは『その時の気分を大事にする』自由なタイプ。新しいものや面白いものにすぐ興味がわく、好奇心いっぱいの人です。固定観念にとらわれず、柔軟に選べるのがあなたの強みです。"
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

    // ▼ タイプ説明を追加する
    const box = document.getElementById("typeDetailBox");
    box.innerHTML = "";

    const desc = typeDescriptions[type];
    const descBox = document.createElement("div");
    descBox.className = "typeDescriptionBox";
    descBox.textContent = desc;

    box.appendChild(descBox);

    // アニメーション表示
    setTimeout(() => {
      descBox.classList.add("show");
    }, 300);

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

    if (q.price) prices.push(q.price);

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

  if (impulsiveRate >= 60 && buyRate >= 50)
    return "せっかちタイプ（すぐ決めちゃう）";

  if (carefulRate >= 60 && priceSensitivity >= 50)
    return "心配性タイプ（慎重に考える）";

  if (noBuyRate >= 60 && priceSensitivity >= 60)
    return "節約家タイプ（買わないことが多い）";

  if (priceSensitivity >= 70 && buyRate >= 40)
    return "お得ハンタータイプ（コスパ重視）";

  return "気分屋タイプ（状況次第で変わる）";
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
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align:center;">${value}</td>
    `;
    table.appendChild(tr);
  });
}

// スプレッドシート送信（修正版）
async function sendToSheet(data) {
  try {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    console.log("送信結果:", res.status);
  } catch (e) {
    console.error("送信エラー:", e);
  }
}
