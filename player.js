// ================================
//  基本変数
// ================================
let playerQuestions = [];
let playerIndex = 0;
let round = 1;
let userId = null;

const genderEl = document.getElementById("playerGender");
const ageEl = document.getElementById("playerAge");

const startScreenEl = document.getElementById("startScreen");
const preSituationScreenEl = document.getElementById("preSituationScreen");
const playerContainerEl = document.getElementById("playerContainer");
const infoScreenEl = document.getElementById("infoScreen");
const secondRoundInfoEl = document.getElementById("secondRoundInfo");
const finalScreenEl = document.getElementById("finalScreen");

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwSR1KwEpJQLQItAJvvB0Y1wY2orXNpK2-9d1RPQ7nF-kNDK3XVgYvBjz49d-vRUy2nuQ/exec";

// ================================
//  Google Sheets 送信
// ================================
async function sendToSheet(data) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("送信エラー:", err);
  }
}

// ================================
//  開始ボタン
// ================================
document.getElementById("startBtn").addEventListener("click", async () => {
  if (!genderEl.value || !ageEl.value) {
    alert("性別と年齢を入力してください");
    return;
  }

  userId = "user_" + Date.now();

  // ★ 回答者情報を最初に送信
  sendToSheet({
    isUserInfo: true,
    userId,
    gender: genderEl.value,
    age: ageEl.value,
  });

  const res = await fetch("questions.json");
  const data = await res.json();

  playerQuestions = data.questions;
  playerIndex = 0;
  round = 1;

  startScreenEl.style.display = "none";
  showPreSituation(playerIndex);
});

// ================================
//  プレ画面表示
// ================================
function showPreSituation(index) {
  const q = playerQuestions[index];

  preSituationScreenEl.style.display = "flex";
  preSituationScreenEl.querySelector("#preSituationText").textContent =
    q.situation;

  document.getElementById("preOkBtn").onclick = () => {
    preSituationScreenEl.style.display = "none";
    showPlayerQuestion(index);
  };
}

// ================================
//  質問画面表示
// ================================
function showPlayerQuestion(index) {
  const q = playerQuestions[index];

  playerContainerEl.style.display = "block";
  document.getElementById("questionNumber").textContent =
    `質問 ${index + 1} / ${playerQuestions.length}`;
  document.getElementById("playerSituation").textContent = q.situation;
  document.getElementById("playerQuestion").textContent = q.question;

  const optionsEl = document.getElementById("playerOptions");
  optionsEl.innerHTML = "";

  let selectedOption = null;
  let answerTime = null;
  const startTime = Date.now();

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "optionButton";
    btn.textContent = opt.label;

    btn.onclick = () => {
      selectedOption = opt;
      answerTime = Date.now() - startTime;

      [...optionsEl.children].forEach((b) =>
        b.classList.remove("selectedOption")
      );
      btn.classList.add("selectedOption");
    };

    optionsEl.appendChild(btn);
  });

  document.getElementById("confirmBtn").onclick = () => {
    if (!selectedOption) {
      alert("選択肢を選んでください");
      return;
    }

    const summary = calculateSummary();

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
      type: summary.type,
    });

    nextPlayerQuestion();
  };
}

// ================================
//  次の質問へ
// ================================
function nextPlayerQuestion() {
  playerIndex++;

  if (playerIndex >= playerQuestions.length) {
    if (round === 1) {
      playerContainerEl.style.display = "none";
      infoScreenEl.style.display = "block";

      document.getElementById("startSecondRoundBtn").onclick = () => {
        infoScreenEl.style.display = "none";
        secondRoundInfoEl.style.display = "block";
      };

      document.getElementById("secondRoundOkBtn").onclick = () => {
        secondRoundInfoEl.style.display = "none";
        round = 2;
        playerIndex = 0;
        showPreSituation(playerIndex);
      };
    } else {
      playerContainerEl.style.display = "none";
      showFinalScreen();
    }
    return;
  }

  showPreSituation(playerIndex);
}

// ================================
//  結果計算（仮）
// ================================
function calculateSummary() {
  return {
    buyRate: 0.5,
    noBuyRate: 0.5,
    priceSensitivity: 0.5,
    impulsiveRate: 0.5,
    carefulRate: 0.5,
    type: "じっくり考えるタイプ",
  };
}

// ================================
//  結果画面
// ================================
function showFinalScreen() {
  finalScreenEl.style.display = "block";

  document.getElementById("resultType").textContent =
    "あなたのタイプ：じっくり考えるタイプ";

  const box = document.getElementById("typeDetailBox");
  box.innerHTML = "";

  const descBox = document.createElement("div");
  descBox.className = "typeDescriptionBox";
  descBox.textContent =
    "あなたは『じっくり考えてから動く』安心感のあるタイプ。選ぶときも、ちゃんと理由を持って決めたい人です。周りからは落ち着いていて信頼できる存在と思われています。ゆっくりでも、あなたの選択はいつも丁寧です。";

  box.appendChild(descBox);

  setTimeout(() => {
    descBox.classList.add("show");
  }, 300);
}
