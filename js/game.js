// game.js – לוגיקת משחק בסיסית

let languageTapWindowOpen = false;
let languageTapTimer = null;

function normalizeHebrewText(text) {
  return Array.from(text).map(toBaseHebrew).join("");
}

const GameState = {
  questions: [],
  currentIndex: 0,
  current: null,
  hintLevel: 0,
  language: "he"
};

let languageMessageTimer = null;

function setLayoutDirection() {
  const dir = GameState.language === "en" ? "ltr" : "rtl";
  document.body.dir = dir;
  document.documentElement.dir = dir;
  const pattern = document.getElementById("pattern");
  const scramble = document.getElementById("scramble");
  if (pattern) pattern.setAttribute("dir", dir);
  if (scramble) scramble.setAttribute("dir", dir);
}

function getLocalizedText(key) {
  const isEnglish = GameState.language === "en";
  switch (key) {
    case "category": return isEnglish ? "Category: " : "קטגוריה: ";
    case "notAll": return isEnglish ? "Not all letters have been placed." : "לא כל האותיות הונחו במקומן.";
    case "correct": return isEnglish ? "Great! Correct answer." : "מעולה! תשובה נכונה.";
    case "incorrect": return isEnglish ? "Not quite, keep trying." : "לא מדויק, המשיכו לנסות.";
    case "hint": return isEnglish ? "Hint" : "רמז";
    case "reveal": return isEnglish ? "Reveal" : "גלה";
    case "skip": return isEnglish ? "Skip" : "דלג";
    case "next": return isEnglish ? "Next" : "הבא";
    case "reset": return isEnglish ? "Reset" : "אפס";
    default: return "";
  }
}

function getLanguageMessage() {
  return GameState.language === "en"
    ? "לחצו שוב למעבר לעברית"
    : "Tap again for English";
}

function showLanguageMessage() {
  const message = document.getElementById("langMessage");
  if (!message) return;

  message.textContent = getLanguageMessage();
  message.classList.add("visible");

  clearTimeout(languageMessageTimer);
  languageMessageTimer = setTimeout(() => {
    message.classList.remove("visible");
  }, 2000);
}

async function loadQuestions() {
  const fileName = GameState.language === "en" ? "questions-en.json" : "questions-he.json";
  const res = await fetch(`data/${fileName}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }
  const data = await res.json();
  GameState.questions = data;
}

async function switchLanguage() {
  GameState.language = GameState.language === "en" ? "he" : "en";
  setLayoutDirection();

  try {
    await loadQuestions();
  } catch (e) {
    alert(`לא ניתן לטעון ${GameState.language === "en" ? "questions-en.json" : "questions-he.json"}: ` + e.message);
    return;
  }

  if (GameState.questions.length === 0) return;

  GameState.currentIndex = Math.floor(Math.random() * GameState.questions.length);
  GameState.current = GameState.questions[GameState.currentIndex];
  GameState.hintLevel = 0;

  renderQuestion(GameState.current);
  resetButtons();
  updateResetButtonState();
}

function nextQuestion() {
  if (GameState.questions.length === 0) return;

  if (GameState.questions.length === 1) {
    GameState.currentIndex = 0;
  } else {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * GameState.questions.length);
    } while (nextIndex === GameState.currentIndex);
    GameState.currentIndex = nextIndex;
  }

  GameState.current = GameState.questions[GameState.currentIndex];
  GameState.hintLevel = 0;

  renderQuestion(GameState.current);
  resetButtons();
}

function setButtonLabel(button, label) {
  const labelSpan = button.querySelector(".button-label");
  if (labelSpan) {
    labelSpan.textContent = label;
  }
  button.setAttribute("aria-label", label);
}

function resetButtons() {
  const hintBtn = document.getElementById("hintBtn");
  const resetBtn = document.getElementById("resetBtn");
  const nextBtn = document.getElementById("nextBtn");

  hintBtn.disabled = false;
  setButtonLabel(hintBtn, getLocalizedText("hint"));
  hintBtn.style.visibility = "visible";
  resetBtn.disabled = true;
  setButtonLabel(nextBtn, getLocalizedText("skip"));
}

function checkAnswer() {
  const user = getUserAnswer();
  const target = normalizeHebrewText(GameState.current.answer.replace(/\s+/g, ""));

  const factBox = document.getElementById("fact");
  const hintBtn = document.getElementById("hintBtn");

  if (!user || user.length !== target.length) {
    factBox.textContent = getLocalizedText("notAll");
    return;
  }

  if (user === target) {
    factBox.innerHTML = `<span class="fact-check">✓</span>${getLocalizedText("correct")}`;
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    setButtonLabel(document.getElementById("nextBtn"), "הבא");
    document.querySelectorAll(".letter").forEach(tile => {
      tile.style.cursor = "default";
      tile.classList.add("disabled");
      tile.removeEventListener("click", onLetterClick);
    });
  } else {
    factBox.textContent = getLocalizedText("incorrect");
  }
}

function showHint() {
  GameState.hintLevel++;

  const factBox = document.getElementById("fact");
  const hintBtn = document.getElementById("hintBtn");

  if (GameState.hintLevel === 1) {
    factBox.textContent = GameState.current.fact;
  } else if (GameState.hintLevel === 2) {
    clearBoardForHint();
    revealRandomLetter();
    setButtonLabel(hintBtn, getLocalizedText("reveal"));
  } else if (GameState.hintLevel === 3) {
    revealAllLetters();
    const resetBtn = document.getElementById("resetBtn");
    const nextBtn = document.getElementById("nextBtn");
    resetBtn.disabled = true;
    resetBtn.style.visibility = "hidden";
    setButtonLabel(nextBtn, getLocalizedText("next"));
    hintBtn.disabled = true;
  }
}

function onLanguageButtonTap() {
  const message = document.getElementById("langMessage");

  // If the window is already open → second tap triggers language switch
  if (languageTapWindowOpen) {
    clearTimeout(languageTapTimer);
    languageTapWindowOpen = false;
    message.classList.remove("visible");
    message.textContent = "";
    switchLanguage();
    return;
  }

  // First tap → show message and open the window
  languageTapWindowOpen = true;
  message.textContent = getLanguageMessage();
  message.classList.add("visible");

  // Close window after 2 seconds
  clearTimeout(languageTapTimer);
  languageTapTimer = setTimeout(() => {
    languageTapWindowOpen = false;
    message.classList.remove("visible");
  }, 2000);
}
