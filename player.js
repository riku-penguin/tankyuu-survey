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

let timer = null;
let preTimer = null;

let selectedOption = null; // ⭐ 選択された選択肢を保存

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

// ⭐ 状況理解パート（カウントダウン付き）
const preSituationScreen = document.createElement("div");
preSituationScreen.className = "screenBox";
preSituationScreen.style.display = "none";
preSituationScreen.style.position = "absolute";
preSituationScreen.style.top = "0";
preSituationScreen.style.left = "0";
preSituationScreen.style.width = "100%";
preSituationScreen.style.zIndex = "0";

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

// ⭐ 全画面を確実に消す
function hideAllScreens() {
  startScreenEl.style.display = "none";
  preSituationScreen.style.display = "none";
  playerContainerEl.style.display = "none";
  infoScreenEl.style.display = "none";
  finalScreenEl.style.display = "none";

  preSituationScreen.style.zIndex = "0";
  playerContainerEl.style.zIndex = "10";
}

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

// ⭐ 状況理解パート表示（カウントダウン）
function showPreSituation(index) {
  const q = playerQuestions[index];

  const { t1, t2 } = parseTime(q.time);

  q.time1 = t1 + 2;
  q.time2 = t2;

  hideAllScreens();
  preSituationScreen.style.display = "block";
  preSituationScreen.style.zIndex = "10";

  preQuestionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;
  preSituationText.textContent = q.situation;

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

// ⭐ 質問開始
function startQuestion(index) {
  hideAllScreens();

  playerContainerEl.style.display = "block";
  playerContainerEl.style.zIndex = "10";

  selectedOption = null;
  confirmBtn.style.display = "none";

  loadPlayerQuestion(index);
}

// ⭐ 質問表示
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

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
      if (elapsed >= limit) {
        clearInterval(timer);
        timer = null;
        handleTimeout(q);
        return;
      }

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
    btn.textContent = opt.label;

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

// ⭐ 決定ボタン
confirmBtn.onclick = () => {
  const q = playerQuestions[playerIndex];

  // ⭐ 二巡目は時間が満たされるまで決定できない
  if (round === 2) {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed < q.time2) {
      alert("まだ時間が経過していません");
      return;
    }
  }

  if (!selectedOption) {
    alert("選択肢を選んでください");
    return;
  }

  if (timer) clearInterval(timer);

  const endTime = Date.now();
  const answerTime = (endTime - startTime) / 1000;

  sendToSheet({
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
    timeout: false
  });

  nextPlayerQuestion();
};

// ⭐ 時間切れ
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

  sendToSheet({
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
    answerTime1: round === 1 ? answerTime : null,
    answerTime2: round === 2 ? answerTime : null,
    timeout: true
  });

  nextPlayerQuestion();
}

// ⭐ 次の質問へ
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

// ⭐ Google スプレッドシート送信用関数
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
  } catch (e) {
    console.error("送信エラー:", e);
  }
}
