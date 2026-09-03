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

function resetProgress() {
  const solved = JSON.parse(localStorage.getItem("solvedLevels") || "{}");
  delete solved[GameState.language];
  localStorage.setItem("solvedLevels", JSON.stringify(solved));
  window.location.reload();
}

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
    case "incorrect": return isEnglish ? "Not quite - keep trying" : "לא מדויק - המשיכו לנסות";
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
  hintBtn.style.backgroundColor = "";
  hintBtn.style.opacity = "";
  hintBtn.style.cursor = "";
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
  const messageBox = document.getElementById("messageBox");

  function showTemporaryMessage(text, isSuccess = false) {
    factBox.classList.add("hidden");

    // Create new content just for the message, no prefix
    const successColor = '#00F0FF'; // Matching the animation glow
    const failColor = '#FF073A';   // Neon Red
    messageBox.innerHTML = `<span style="display: inline-block; font-size: 1rem; font-weight: ${isSuccess ? 'normal' : 'normal'}; color: ${isSuccess ? successColor : failColor}; text-shadow: 0 0 10px ${isSuccess ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 7, 58, 0.7)'};">${text}</span>`;

    messageBox.style.color = "transparent";
    messageBox.style.fontWeight = "normal";
    messageBox.style.fontSize = "1rem";
    messageBox.style.fontFamily = "inherit";
    messageBox.style.backgroundColor = "transparent";
    messageBox.style.zIndex = "20";
        messageBox.style.pointerEvents = "auto";
        messageBox.style.visibility = "visible";

        messageBox.classList.add("show");

    // הוספת הנשימה בלופ רק בהצלחה
    if (isSuccess) {
      messageBox.classList.remove("success-breath");
      void messageBox.offsetWidth; // Force animation restart
      messageBox.classList.add("success-breath");
    } else {
      messageBox.classList.remove("success-breath");
    }
    
    if (!isSuccess) {
      setTimeout(() => {
        messageBox.classList.remove("show");
        messageBox.style.visibility = "hidden";
        factBox.classList.remove("hidden");
      }, 2000);
    }
  }

  if (!user || user.length !== target.length) {
    showTemporaryMessage(getLocalizedText("notAll"));
    return;
  }

  if (user === target) {
    let successText;
    if (GameState.hintLevel === 0) {
      successText = GameState.language === "en" ? "Well done - solved without hints!" : "כל הכבוד - פתרת ללא רמזים!";
    } else if (GameState.hintLevel === 1) {
      successText = GameState.language === "en" ? "Nice work - solved with one hint" : "יפה מאוד - פתרת עם רמז אחד";
    } else {
      successText = GameState.language === "en" ? "Good job - solved with two hints" : "עבודה טובה - פתרת עם שני רמזים";
    }

    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;

    // setButtonLabel(document.getElementById("nextBtn"), getLocalizedText("next"));
    // document.getElementById("nextBtn").disabled = false;

    // next-attention start
    const nextBtn = document.getElementById("nextBtn");
    setButtonLabel(nextBtn, getLocalizedText("next"));
    nextBtn.disabled = false;
    nextBtn.classList.remove("next-attention");
    setTimeout(() => {
      nextBtn.classList.add("next-attention");
    }, 2200);
    // next-attention end

    // Apply glow-n-bounce
  const slots = [...document.querySelectorAll(".slot")];
    slots.forEach((slot, index) => {
        setTimeout(() => {
            animateSuccessTile2(slot);
        }, index * 120);
    });

    // Trigger fireworks after a delay to allow for the glow-n-bounce
    setTimeout(() => {
        showTemporaryMessage(successText, true);
        if (GameState.hintLevel === 0) {
          triggerFireworks("high");
        }
    }, 50 + (slots.length * 120));

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

    document.getElementById("clue").style.pointerEvents = "none";
  } else {
    showTemporaryMessage(getLocalizedText("incorrect"));
  }
}

async function showHint() {
  GameState.hintLevel++;
  const hintBtn = document.getElementById("hintBtn");
  const slots = [...document.querySelectorAll(".slot")];

  // Disable all letter clicking at start
  const allTiles = document.querySelectorAll(".letter");
  allTiles.forEach(t => t.style.pointerEvents = "none");

  // Call the clear board function before revealing hint letters
  clearBoardForHint();

  let count = 0;
  if (GameState.hintLevel === 1) {
    count = Math.max(1, Math.ceil(slots.length * 0.2));
  } else if (GameState.hintLevel === 2) {
    count = Math.max(1, Math.ceil(slots.length * 0.2));
    hintBtn.disabled = true;
    hintBtn.style.backgroundColor = "#333";
    hintBtn.style.opacity = "0.6";
    hintBtn.style.cursor = "default";
  } else if (GameState.hintLevel === 3) {
    count = slots.length;
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    document.getElementById("resetBtn").style.visibility = "hidden";
    setButtonLabel(document.getElementById("nextBtn"), getLocalizedText("next"));
  }

  // Animate one by one
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);
  const emptyIndices = slots
    .map((s, i) => (s.dataset.filled === "false" ? i : null))
    .filter(i => i !== null);

  const toReveal = shuffleArray(emptyIndices).slice(0, count);

  for (let i = 0; i < toReveal.length; i++) {
    const idx = toReveal[i];
    const slot = slots[idx];
    const letterBase = toBaseHebrew(letters[idx]);

    // 1. Identify and clear the tile first
    const tiles = [...document.querySelectorAll(".letter")].filter(
      t => !t.classList.contains("empty") && t.dataset.base === letterBase
      );

    if (tiles.length > 0) {
      const tile = tiles[0];

      // Create a visual copy for animation to ensure the tile itself can be made empty immediately
      const fadeTile = tile.cloneNode(true);
      const computedStyle = getComputedStyle(tile);

      ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "color", "background", "backgroundColor", "border", "borderRadius", "boxShadow", "boxSizing", "padding"].forEach(prop => {
        fadeTile.style[prop] = computedStyle[prop];
      });

      fadeTile.style.position = "fixed";
      const rect = tile.getBoundingClientRect();
      fadeTile.style.left = `${rect.left}px`;
      fadeTile.style.top = `${rect.top}px`;
      fadeTile.style.width = `${rect.width}px`;
      fadeTile.style.height = `${rect.height}px`;
      fadeTile.style.margin = "0";
      fadeTile.style.zIndex = "1000";
      fadeTile.style.pointerEvents = "none";

      document.body.appendChild(fadeTile);

      // Make original empty immediately
        tile.classList.add("empty");
      tile.textContent = "";
      tile.dataset.letter = letterBase;
      tile.dataset.locked = "true";
        tile.removeEventListener("click", onLetterClick);
        tile.style.cursor = "default";

      // Animate out
      animateScaleOut(fadeTile, 200).onfinish = () => fadeTile.remove();
  }

    // 3. Then appear in the slot
    placeLetterInSlot(slot, letterBase);
    slot.dataset.locked = "true";

    const letterSpan = slot.querySelector(".slot-text");
    if (letterSpan) {
      animateScaleIn(letterSpan, 350);
  }

    // 4. Wait for animations to complete before moving to next
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  updateActiveSlot();
  // Re-enable clicking for tiles that are not "empty"
  const updatedTiles = document.querySelectorAll(".letter");
  updatedTiles.forEach(t => {
    t.style.pointerEvents = "auto";
  });
}

function revealCount(count) {
    // This function is now superseded by logic inside showHint, can be removed or kept as a helper
}

function revealAllLetters() {
  // This function is also now superseded by showHint logic
}

