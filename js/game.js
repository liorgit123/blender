// game.js – לוגיקת משחק בסיסית

function normalizeHebrewText(text) {
  return Array.from(text).map(toBaseHebrew).join("");
}

const GameState = {
  questions: [],
  currentIndex: 0,
  current: null,
  hintLevel: 0,
  language: localStorage.getItem("gameLanguage") || "he",
  solved: JSON.parse(localStorage.getItem("solvedLevels") || "{}")
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
    case "clue": return isEnglish ? "Clue: " : "רמז: ";
    case "solved": return isEnglish ? "Solved" : "פתרת";
    case "total": return isEnglish ? "Total" : "סה\"כ";
    case "remaining": return isEnglish ? "REMAINING" : "נשארו";
    case "counter": return isEnglish ? "solved {solved} out of {total}" : "נפתרו {solved} מתוך {total}";
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
    ? "לחצו שוב לעברית"
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

function updateCounter() {
  const counterEl = document.getElementById("counter");
  if (!counterEl) return;

  const solved = GameState.solved[GameState.language] || [];
  const total = GameState.questions.length;
  const percentage = total > 0 ? Math.round((solved.length / total) * 100) : 0;

  counterEl.innerHTML = `
    <div class="counter-content">
      <strong>${percentage}%</strong> (${solved.length}/${total})
    </div>
  `;
}
async function loadQuestions() {
  const fileName = GameState.language === "en" ? "questions-en.json?v=7" : "questions-he.json?v=7";
  const res = await fetch(`data/${fileName}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }
  const data = await res.json();
  // Assign unique IDs to questions if they don't have them
  GameState.questions = data.map((q, index) => ({ ...q, id: q.id || index }));
  updateCounter();
}

function checkWinCondition() {
    const solved = GameState.solved[GameState.language] || [];
  const unsolvedQuestions = GameState.questions.filter(q => !solved.includes(q.id));

  if (unsolvedQuestions.length === 0) {
    window.location.href = GameState.language === "en" ? "win_en.html" : "win_he.html";
    return true;
}
  return false;
}

async function switchLanguage() {
  GameState.language = GameState.language === "en" ? "he" : "en";
  localStorage.setItem("gameLanguage", GameState.language);

  // Load questions first so we have the list to check win condition against
  try {
    await loadQuestions();
  } catch (e) {
    alert(`לא ניתן לטעון ${GameState.language === "en" ? "questions-en.json" : "questions-he.json"}: ` + e.message);
    return;
}

  // Now check if all levels are solved
  if (checkWinCondition()) return;

  setLayoutDirection();
      updateCounter();

  if (GameState.questions.length === 0) return;

    const solved = GameState.solved[GameState.language] || [];
  const unsolvedQuestions = GameState.questions.filter(q => !solved.includes(q.id));

  if (unsolvedQuestions.length === 0) return;

  GameState.currentIndex = Math.floor(Math.random() * unsolvedQuestions.length);
  GameState.current = unsolvedQuestions[GameState.currentIndex];
  GameState.currentIndex = GameState.questions.findIndex(q => q.id === GameState.current.id);
  GameState.hintLevel = 0;

  void document.body.offsetWidth;
  renderQuestion(GameState.current);
  resetButtons();
  updateResetButtonState();
}

function nextQuestion() {
  if (checkWinCondition()) return;

  if (GameState.questions.length === 0) return;

    const solved = GameState.solved[GameState.language] || [];

  // Filter questions that are NOT in the solved list
  const unsolvedQuestions = GameState.questions.filter(q => !solved.includes(q.id));

  // If no unsolved questions, show win dialog
  if (unsolvedQuestions.length === 0) {
    showWinDialog();
    return;
}

  // Pick a random unsolved question
  let nextQuestion;
  if (unsolvedQuestions.length > 1 && GameState.current) {
    const currentCategory = GameState.current.category;
    const differentCategoryQuestions = unsolvedQuestions.filter(q => q.category !== currentCategory);

    if (differentCategoryQuestions.length > 0) {
      nextQuestion = differentCategoryQuestions[Math.floor(Math.random() * differentCategoryQuestions.length)];
    } else {
      const candidates = unsolvedQuestions.filter(q => q.id !== GameState.current.id);
      nextQuestion = candidates[Math.floor(Math.random() * candidates.length)];
    }
  } else {
    nextQuestion = unsolvedQuestions[Math.floor(Math.random() * unsolvedQuestions.length)];
  }

  GameState.current = nextQuestion;
  GameState.currentIndex = GameState.questions.findIndex(q => q.id === GameState.current.id);

  GameState.hintLevel = 0;

  void document.body.offsetWidth;
  renderQuestion(GameState.current);
  resetButtons();
  }

function showWinDialog() {
  // Logic replaced by redirects to win_en.html / win_he.html
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

  // Update Reset button: visible, but disabled if no tiles are placed
  resetBtn.style.visibility = "visible";
  setButtonLabel(nextBtn, getLocalizedText("skip"));

  // Initial check for buttons state
  updateResetButtonState();

  // Disable next button if only one unsolved question is left
    const solved = GameState.solved[GameState.language] || [];
  const unsolvedQuestions = GameState.questions.filter(q => !solved.includes(q.id));
  nextBtn.disabled = unsolvedQuestions.length <= 1;

  setButtonLabel(nextBtn, getLocalizedText("skip"));
}

function checkAnswer() {
  const user = getUserAnswer();
  const target = normalizeHebrewText(GameState.current.answer.replace(/\s+/g, ""));

  const factBox = document.getElementById("clue");
  const hintBtn = document.getElementById("hintBtn");

  if (!user || user.length !== target.length) {
    const previousFact = GameState.current.fact;
    const wasBlurred = factBox.classList.contains("blurred");

    factBox.textContent = getLocalizedText("notAll");

    setTimeout(() => {
      if (factBox.textContent === getLocalizedText("notAll")) {
        factBox.innerHTML = `<span class="clue-prefix">${getLocalizedText("clue")}</span><span class="clue-text" id="clue-text">${previousFact}</span>`;

        // Restore previous blur state
        if (wasBlurred) {
        factBox.classList.add("blurred");
        factBox.onclick = () => factBox.classList.remove("blurred");
        } else {
            factBox.classList.remove("blurred");
            factBox.onclick = null;
      }
  }
    }, 2000);
    return;
}

  if (user === target) {
    factBox.innerHTML = `<span class="fact-check">✓</span>${getLocalizedText("correct")}`;
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    // Keep it visible as per requirement
    setButtonLabel(document.getElementById("nextBtn"), getLocalizedText("next"));

    // Ensure button is enabled when correct, unless it was disabled via checkWinCondition
    document.getElementById("nextBtn").disabled = false;

    // Trigger fireworks
    triggerFireworks();

    // Mark as solved
    const solved = GameState.solved[GameState.language] || [];
    const questionId = GameState.current.id; // Using the id we assigned
    if (!solved.includes(questionId)) {
      solved.push(questionId);
      GameState.solved[GameState.language] = solved;
      localStorage.setItem("solvedLevels", JSON.stringify(GameState.solved));
      updateCounter();
  }

    // Disable active marker
    document.querySelectorAll(".slot").forEach(s => s.dataset.active = "false");

    document.querySelectorAll(".letter").forEach(tile => {
      tile.style.cursor = "default";
      tile.classList.add("disabled");
      tile.removeEventListener("click", onLetterClick);
  });
  } else {
    const previousFact = GameState.current.fact;
    const wasBlurred = factBox.classList.contains("blurred");

    factBox.textContent = getLocalizedText("incorrect");

    setTimeout(() => {
      if (factBox.textContent === getLocalizedText("incorrect")) {
        factBox.innerHTML = `<span class="clue-prefix">${getLocalizedText("clue")}</span><span class="clue-text" id="clue-text">${previousFact}</span>`;

        // Restore previous blur state
        if (wasBlurred) {
        factBox.classList.add("blurred");
        factBox.onclick = () => factBox.classList.remove("blurred");
        } else {
            factBox.classList.remove("blurred");
            factBox.onclick = null;
}
  }
    }, 2000);
}
}

function showHint() {
  GameState.hintLevel++;
  const hintBtn = document.getElementById("hintBtn");
  const slots = [...document.querySelectorAll(".slot")];

  // Call the clear board function before revealing hint letters
  clearBoardForHint();

  if (GameState.hintLevel === 1) {
    // 20%
    revealCount(Math.max(1, Math.ceil(slots.length * 0.2)));
  } else if (GameState.hintLevel === 2) {
    // 50%
    revealCount(Math.max(1, Math.ceil(slots.length * 0.3)));
  } else if (GameState.hintLevel === 3) {
    // All
    revealAllLetters();
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    document.getElementById("resetBtn").style.visibility = "hidden"; // Hide reset
    setButtonLabel(document.getElementById("nextBtn"), getLocalizedText("next"));
  }
}

function revealCount(count) {
  const slots = [...document.querySelectorAll(".slot")];
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  const emptyIndices = slots
    .map((s, i) => (s.dataset.filled === "false" ? i : null))
    .filter(i => i !== null);

  // Try to find a set of indices that are not adjacent
  let toReveal = [];
  const shuffled = shuffleArray(emptyIndices);

  for (let idx of shuffled) {
    if (!toReveal.some(revealedIdx => Math.abs(revealedIdx - idx) === 1)) {
      toReveal.push(idx);
    }
    if (toReveal.length === count) break;
  }

  // If we couldn't find enough non-adjacent slots, fill with remaining
  if (toReveal.length < count) {
    for (let idx of shuffled) {
      if (!toReveal.includes(idx)) {
        toReveal.push(idx);
      }
      if (toReveal.length === count) break;
    }
  }

  toReveal.forEach(idx => {
    const slot = slots[idx];
    const letterBase = toBaseHebrew(letters[idx]);
    placeLetterInSlot(slot, letterBase);
    slot.dataset.locked = "true";

    const tiles = [...document.querySelectorAll(".letter")].filter(
      t => !t.classList.contains("empty") && t.dataset.base === letterBase
    );
    if (tiles.length > 0) {
      const tile = tiles[0];
      tile.dataset.letter = letterBase;
      tile.dataset.locked = "true";
      tile.textContent = "";
      tile.classList.add("empty");
      tile.removeEventListener("click", onLetterClick);
      tile.style.cursor = "default";
    }
  });
  updateResetButtonState();
}

