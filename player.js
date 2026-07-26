// ★ スプレッドシート連携URL
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzuKDw033gPRKQqDgWnTzqB_xQfZ0zx5q8rcjbB0QIl4pllqv-gzuDRUmK8_Cjfadr8Tg/exec";

// ★ 共有用リンク（陸が使いたいURL）
const SHARE_URL = "https://docs.google.com/spreadsheets/d/19lLmoS2wiBFxPY-nFQi7NQMLsSJQGNoWNeIbjqEITX4/edit?gid=0";

let playerQuestions = [];
let playerIndex = 0;
let startTime = 0;
let round = 1; // 1巡目 / 2巡目

const genderEl = document.getElementById("playerGender");
const ageEl = document.getElementById("playerAge");

const startScreenEl = document.getElementById("startScreen");
const playerContainerEl = document.getElementById("playerContainer");
const infoScreenEl = document.getElementById("infoScreen");
const finalScreenEl = document.getElementById("finalScreen");

const situationEl = document.getElementById("playerSituation");
const questionEl = document.getElementById("playerQuestion");
const optionsEl = document.getElementById("playerOptions");

// ⭐ 最初の「開始する」ボタン
document.getElementById("startBtn").addEventListener("click", async () => {
  if (!genderEl.value || !ageEl.value) {
    alert("性別と年齢を入力してください");
    return;
  }

  // JSON自動読み込み
  const res = await fetch("questions.json");
  const data = await res.json();

  playerQuestions = data.questions;
  playerIndex = 0;
  round = 1;

  startScreenEl.style.display = "none";
  playerContainerEl.style.display = "block";

  loadPlayerQuestion(playerIndex);
});

// ⭐ 質問表示
function loadPlayerQuestion(index) {
  const q = playerQuestions[index];

  situationEl.textContent = q.situation || "";
  questionEl.textContent = q.question || "";

  optionsEl.innerHTML = "";
  startTime = Date.now();

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.textContent = opt.label;

    btn.onclick = () => {
      const endTime = Date.now();
      const answerTime = (endTime - startTime) / 1000;

      const timeout =
        round === 1 && q.time1 != null ? answerTime > q.time1 : false;

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

  // 一巡目終了
  if (round === 1 && playerIndex >= playerQuestions.length) {
    playerContainerEl.style.display = "none";
    infoScreenEl.style.display = "block";
    return;
  }

  // 二巡目終了
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
    alert("コピーに失敗しました。手動でコピーしてください。\n" + SHARE_URL);
  }
});
