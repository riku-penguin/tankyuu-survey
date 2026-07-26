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
  playerContainerEl.style.display = "block";

  loadPlayerQuestion(playerIndex);
});

// ⭐ 質問表示（完全版）
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  // UI更新
  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";
  questionNumber.textContent = `質問 ${index + 1} / ${playerQuestions.length}`;

  optionsEl.innerHTML = "";
  startTime = Date.now();

  // 時間制限（1巡目のみ）
  let limit = round === 1 ? q.time1 : q.time2;
  let timer = null;

  if (limit != null) {
    let remaining = limit;

    timerText.textContent = `残り時間: ${remaining} 秒`;
    timerBar.style.width = "100%";

    timer = setInterval(() => {
      remaining--;
      timerText.textContent = `残り時間: ${remaining} 秒`;
      timerBar.style.width = `${(remaining / limit) * 100}%`;

      if (remaining <= 0) {
        clearInterval(timer);

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
    }, 1000);
  }

  // パステルカラーセット
  const pastelClasses = [
    "#d8e9ff",
    "#ffd8e8",
    "#d8ffd8",
    "#fff4c2",
    "#e8d8ff"
  ];

  // 選択肢ボタン
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.style.backgroundColor =
      pastelClasses[Math.floor(Math.random() * pastelClasses.length)];
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

// ⭐ スプレッドシート送信
function sendToSheet(payload) {
  fetch(SHEET_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });
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

  loadPlayerQuestion(playerIndex);
}

// ⭐ 二巡目開始
document.getElementById("startSecondRoundBtn").addEventListener("click", () => {
  round = 2;
  playerIndex = 0;

  infoScreenEl.style.display = "none";
  playerContainerEl.style.display = "block";

  loadPlayerQuestion(playerIndex);
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
