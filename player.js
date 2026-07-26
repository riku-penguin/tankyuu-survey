// ★ スプレッドシート連携URL
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzuKDw033gPRKQqDgWnTzqB_xQfZ0zx5q8rcjbB0QIl4pllqv-gzuDRUmK8_Cjfadr8Tg/exec";

// ★ 共有用リンク
const SHARE_URL =
  "https://docs.google.com/spreadsheets/d/19lLmoS2wiBFxPY-nFQi7NQMLsSJQGNoWNeIbjqEITX4/edit?gid=0";

let playerQuestions = [];
let playerIndex = 0;
let startTime = 0;
let round = 1;

// ⭐ タイマーをグローバル化（暴走防止）
let timer = null;
let preTimer = null;

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

// ⭐ 状況理解パート（新規追加）
const preSituationScreen = document.createElement("div");
preSituationScreen.className = "screenBox";
preSituationScreen.style.display = "none";
preSituationScreen.innerHTML = `
  <div id="preCountdown" style="font-size:14px; color:#666; margin-bottom:5px;"></div>
  <div id="preQuestionNumber"></div>
  <div id="preSituationText" style="margin-top:10px; margin-bottom:20px;"></div>
  <button id="preOkBtn" class="primaryButton">OK</button>
`;
document.body.appendChild(preSituationScreen);

const preCountdown = document.getElementById("preCountdown");
const preQuestionNumber = document.getElementById("preQuestionNumber");
const preSituationText = document.getElementById("preSituationText");
const preOkBtn = document.getElementById("preOkBtn");

// ⭐ 開始ボタン
document.getElementById("startBtn").addEventListener("click", async () => {
  if (!genderEl.value || !ageEl.value) {
    alert("性別と年齢を入力してください");
    return;
  }

  const res = await fetch("questions.json");
  const data = await res.json();

  playerQuestions = data.questions;
  playerIndex = 0;
  round = 1;

  startScreenEl.style.display = "none";

  showPreSituation(playerIndex);
});

// ⭐ time の自動変換
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

// ⭐ 状況理解パート表示（カウントダウン付き）
function showPreSituation(index) {
  const q = playerQuestions[index];

  const { t1, t2 } = parseTime(q.time);

  q.time1 = t1 + 2; // 一巡目 +2秒
  q.time2 = t2;

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;
  preSituationText.textContent = q.situation;

  // ⭐ 画面切り替え（確実に）
  hideAllScreens();
  preSituationScreen.style.display = "block";

  // ⭐ カウントダウン（5秒）
  let remain = 5;
  preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

  if (preTimer) clearTimeout(preTimer);
  preTimer = setInterval(() => {
    remain--;
    preCountdown.textContent = `あと ${remain} 秒で質問画面に移行します`;

    if (remain <= 0) {
      clearInterval(preTimer);
      startQuestion(index);
    }
  }, 1000);

  // ⭐ OKボタンで即進行
  preOkBtn.onclick = () => {
    clearInterval(preTimer);
    startQuestion(index);
  };
}

// ⭐ 質問開始
function startQuestion(index) {
  hideAllScreens();

  playerContainerEl.style.display = "block";

  loadPlayerQuestion(index);
}

// ⭐ 質問表示（完全安定版）
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  optionsEl.innerHTML = "";
  startTime = Date.now();

  let limit = round === 1 ? q.time1 : q.time2;

  // ⭐ タイマー停止（暴走防止）
  if (timer) clearInterval(timer);
  timer = null;

  timerBar.style.backgroundColor = round === 1 ? "#8bc34a" : "#bdbdbd";
  timerBar.style.width = round === 1 ? "100%" : "0%";

  timerText.textContent =
    round === 1 ? `残り時間: ${limit} 秒` : `経過時間: 0 秒`;

  // ⭐ 滑らかタイムバー（50ms更新）
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
      if (elapsed >= limit) {
        clearInterval(timer);
        timer = null;
        handleTimeout(q);
        return;
      }

      timerText.textContent = `経過時間: ${Math.floor(elapsed)} 秒`;
      timerBar.style.width = `${(elapsed / limit) * 100}%`;
    }
  }, 50);

  // ⭐ 選択肢
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.textContent = opt.label;

    btn.onclick = () => {
      if (timer) clearInterval(timer);
      timer = null;

      const endTime = Date.now();
      const answerTime = (endTime - startTime) / 1000;

      const timeout = answerTime > limit;

      sendToSheet({
        questionId: q.id,
        selected: opt.key,
        optionLabel: opt.label,
        price: opt.price ?? null,
        category: q.category ?? "",
        time1: q.time1,
        time2: q.time2,
        gender: genderEl.value,
        age: ageEl.value,
        round,
        answerTime1: round === 1 ? answerTime : null,
        answerTime2: round === 2 ? answerTime : null,
        timeout
      });

      nextPlayerQuestion();
    };

    optionsEl.appendChild(btn);
  });
}

// ⭐ 時間切れ
function handleTimeout(q) {
  if (timer) clearInterval(timer);
  timer = null;

  const endTime = Date.now();
  const answerTime = (endTime - startTime) / 1000;

  sendToSheet({
    questionId: q.id,
    selected: null,
    optionLabel: "時間切れ",
    price: null,
    category: q.category ?? "",
    time1: q.time1,
    time2: q.time2,
    gender: genderEl.value,
    age: ageEl.value,
    round,
    answerTime1: round === 1 ? answerTime : null,
    answerTime2: round === 2 ? answerTime : null,
    timeout: true
  });

  nextPlayerQuestion();
}

// ⭐ 次の質問へ（画面が必ず切り替わる）
function nextPlayerQuestion() {
  hideAllScreens();

  playerIndex++;

  if (round === 1 && playerIndex >= playerQuestions.length) {
    infoScreenEl.style.display = "block";
    return;
  }

  if (round === 2 && playerIndex >= playerQuestions.length) {
    finalScreenEl.style.display = "block";
    return;
  }

  showPreSituation(playerIndex);
}

// ⭐ 画面を全部消す（競合防止）
function hideAllScreens() {
  playerContainerEl.style.display = "none";
  preSituationScreen.style.display = "none";
  infoScreenEl.style.display = "none";
  finalScreenEl.style.display = "none";
}

// ⭐ 二巡目開始
document.getElementById("startSecondRoundBtn").addEventListener("click", () => {
  round = 2;
  playerIndex = 0;

  hideAllScreens();
  showPreSituation(playerIndex);
});

// ⭐ 共有リンクコピー
document.getElementById("copyShareLinkBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(SHARE_URL);
    alert("共有用リンクをコピーしました！");
  } catch (e) {
    alert("コピーに失敗しました。\n" + SHARE_URL);
  }
});
