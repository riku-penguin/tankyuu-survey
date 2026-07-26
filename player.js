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
  <div id="preQuestionNumber"></div>
  <div id="preSituationText" style="margin-top:10px; margin-bottom:20px;"></div>
  <button id="preOkBtn" class="primaryButton">OK</button>
`;
document.body.appendChild(preSituationScreen);

const preQuestionNumber = document.getElementById("preQuestionNumber");
const preSituationText = document.getElementById("preSituationText");
const preOkBtn = document.getElementById("preOkBtn");

let preTimer = null;

// ⭐ 最初の開始ボタン
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

  // ⭐ 最初は状況理解パートへ
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

// ⭐ 状況理解パート表示
function showPreSituation(index) {
  const q = playerQuestions[index];

  const { t1, t2 } = parseTime(q.time);
  q.time1 = t1;
  q.time2 = t2;

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;
  preSituationText.textContent = q.situation;

  preSituationScreen.style.display = "block";
  playerContainerEl.style.display = "none";
  infoScreenEl.style.display = "none";

  // ⭐ 5秒で自動進行
  if (preTimer) clearTimeout(preTimer);
  preTimer = setTimeout(() => {
    startQuestion(index);
  }, 5000);

  // ⭐ OKボタンで進行
  preOkBtn.onclick = () => {
    clearTimeout(preTimer);
    startQuestion(index);
  };
}

// ⭐ 質問開始
function startQuestion(index) {
  preSituationScreen.style.display = "none";
  playerContainerEl.style.display = "block";

  loadPlayerQuestion(index);
}

// ⭐ 質問表示（完全版）
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  optionsEl.innerHTML = "";
  startTime = Date.now();

  let limit = round === 1 ? q.time1 : q.time2;
  let timer = null;

  // ⭐ タイムバー初期色
  if (round === 1) {
    timerBar.style.backgroundColor = "#8bc34a"; // 緑
  } else {
    timerBar.style.backgroundColor = "#bdbdbd"; // グレー
  }

  if (limit != null) {
    let remaining = limit;
    let elapsed = 0;

    timerText.textContent = round === 1
      ? `残り時間: ${remaining} 秒`
      : `経過時間: 0 秒`;

    timerBar.style.width = round === 1 ? "100%" : "0%";

    timer = setInterval(() => {
      const now = Date.now();
      elapsed = Math.floor((now - startTime) / 1000);

      if (round === 1) {
        remaining = limit - elapsed;
        timerText.textContent = `残り時間: ${remaining} 秒`;
        timerBar.style.width = `${(remaining / limit) * 100}%`;

        const ratio = remaining / limit;
        if (ratio > 0.7) timerBar.style.backgroundColor = "#8bc34a";
        else if (ratio > 0.4) timerBar.style.backgroundColor = "#fdd835";
        else if (ratio > 0.2) timerBar.style.backgroundColor = "#fb8c00";
        else timerBar.style.backgroundColor = "#e53935";

        if (remaining <= 0) {
          clearInterval(timer);
          handleTimeout(q);
        }
      } else {
        timerText.textContent = `経過時間: ${elapsed} 秒`;
        timerBar.style.width = `${(elapsed / limit) * 100}%`;

        const ratio = elapsed / limit;
        const blueLevel = Math.min(255, Math.floor(180 + ratio * 75));
        timerBar.style.backgroundColor = `rgb(${blueLevel}, ${blueLevel}, 255)`;

        if (elapsed >= limit) {
          clearInterval(timer);
          handleTimeout(q);
        }
      }
    }, 1000);
  }

  // ⭐ 選択肢ボタン
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.textContent = opt.label;

    btn.onclick = () => {
      if (timer) clearInterval(timer);

      const endTime = Date.now();
      const answerTime = (endTime - startTime) / 1000;

      const timeout = limit != null ? answerTime > limit : false;

      sendToSheet({
        questionId: q.id,
        selected: opt.key,
        optionLabel: opt.label,
        price: opt.price ?? null,
        category: q.category ?? "",
        time1: q.time1 ?? null,
        time2: q.time2 ?? null,
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

// ⭐ 時間切れ処理
function handleTimeout(q) {
  const endTime = Date.now();
  const answerTime = (endTime - startTime) / 1000;

  sendToSheet({
    questionId: q.id,
    selected: null,
    optionLabel: "時間切れ",
    price: null,
    category: q.category ?? "",
    time1: q.time1 ?? null,
    time2: q.time2 ?? null,
    gender: genderEl.value,
    age: ageEl.value,
    round,
    answerTime1: round === 1 ? answerTime : null,
    answerTime2: round === 2 ? answerTime : null,
    timeout: true
  });

  nextPlayerQuestion();
}

// ⭐ 次の質問へ
function nextPlayerQuestion() {
  playerIndex++;

  if (round === 1 && playerIndex >= playerQuestions.length) {
    playerContainerEl.style.display = "none";
    infoScreenEl.style.display = "block";
    return;
  }

  if (round === 2 && playerIndex >= playerQuestions.length) {
    playerContainerEl.style.display = "none";
    infoScreenEl.style.display = "none";
    finalScreenEl.style.display = "block";
    return;
  }

  // ⭐ 次の質問の状況理解パートへ
  showPreSituation(playerIndex);
}

// ⭐ 二巡目開始
document.getElementById("startSecondRoundBtn").addEventListener("click", () => {
  round = 2;
  playerIndex = 0;

  infoScreenEl.style.display = "none";

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
