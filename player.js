// ★ スプレッドシート連携URL（新しいURL）
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwSR1KwEpJQLQItAJvvB0Y1wY2orXNpK2-9d1RPQ7nF-kNDK3XVgYvBjz49d-vRUy2nuQ/exec";

// ★ 共有用リンク（必要なら変更）
const SHARE_URL =
  "https://docs.google.com/spreadsheets/d/19lLmoS2wiBFxPY-nFQi7NQMLsSJQGNoWNeIbjqEITX4/edit?gid=0";

let playerQuestions = [];
let playerIndex = 0;
let startTime = 0;
let round = 1;

let timer = null;
let preTimer = null;

let selectedOption = null;

// ▼▼▼ プレ画面の要素を正しく取得（これが超重要） ▼▼▼
const preSituationText = document.getElementById("preSituationText");
const preCountdown = document.getElementById("preCountdown");
const preQuestionNumber = document.getElementById("preQuestionNumber");
// ▲▲▲ これがないと状況説明が真っ白になる ▲▲▲

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

  // ▼▼▼ ここで状況説明を書き込む（これが表示されるようになった） ▼▼▼
  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;
  preSituationText.textContent = q.situation;
  // ▲▲▲

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

    } else {
      timerText.textContent = `経過時間: ${Math.floor(elapsed)} 秒`;

      timerBar.style.width = `${(elapsed / limit) * 100}%`;

      const ratio = elapsed / limit;
      const gray = 200 - ratio * 120;
      timerBar.style.background = `rgb(${gray}, ${gray}, 255)`;
    }
  }, 50);

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
  const
