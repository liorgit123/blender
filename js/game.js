// game.js – לוגיקת משחק בסיסית

function normalizeHebrewText(text) {
  return Array.from(text).map(toBaseHebrew).join("");
}

const LEVEL_PROGRESS_KEY = "levelProgress";
const LEGACY_SOLVED_KEY = "solvedLevels";
const LEGACY_HINT_KEY = "hintProgress";
const LANDMARKS = [10, 25, 50, 75, 90];
const LANDMARK_STATE_KEY = "landmarkProgress";
const COINS_KEY = "gameCoins";
const STARTING_COINS = 50;
const SOLVE_COIN_REWARD = 10;
const HINT_COIN_COST = 10;

function calculateDifficulty(answer) {
  const normalized = answer.normalize("NFC");

  // Extract letters only (case-insensitive)
  const letters = Array.from(normalized)
    .filter(char => /\p{L}/u.test(char))
    .map(char => char.toLocaleLowerCase());

  const totalLetters = letters.length;
  if (totalLetters === 0) return 0;

  // Count words (letters only inside each word)
  const words = normalized
    .split(/[\s-]+/)
    .map(word => word.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);

  const wordCount = words.length;

  // New simplified difficulty formula:
  // (TotalLetters - 1.5 * WordCount) * 100 + random(0–200)
  const baseScore = totalLetters - 1.5 * wordCount;
  const randomBonus = Math.floor(Math.random() * 201); // 0-200

  return Math.round(baseScore * 100 + randomBonus);
}

function loadLevelProgress() {
  const levelProgress = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY) || "{}");
  const solved = JSON.parse(localStorage.getItem(LEGACY_SOLVED_KEY) || "{}");
  const hintProgress = JSON.parse(localStorage.getItem(LEGACY_HINT_KEY) || "{}");

  Object.entries(solved).forEach(([language, questionIds]) => {
    const languageProgress = levelProgress[language] || {};
    questionIds.forEach(questionId => {
      languageProgress[questionId] = {
        ...(languageProgress[questionId] || {}),
        is_solved: true
      };
    });
    levelProgress[language] = languageProgress;
  });

  Object.entries(hintProgress).forEach(([language, questions]) => {
    const languageProgress = levelProgress[language] || {};
    Object.entries(questions).forEach(([questionId, progress]) => {
      languageProgress[questionId] = {
        ...(languageProgress[questionId] || {}),
        hintCount: progress.hintCount || 0,
        revealedIndexes: progress.revealedIndexes || []
      };
    });
    levelProgress[language] = languageProgress;
  });

  localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(levelProgress));
  localStorage.removeItem(LEGACY_SOLVED_KEY);
  localStorage.removeItem(LEGACY_HINT_KEY);
  return levelProgress;
}

const GameState = {
  questions: [],
  currentIndex: 0,
  current: null,
  hintLevel: 0,
  language: localStorage.getItem("gameLanguage") || "he",
  levelProgress: loadLevelProgress(),
  difficultyById: {}
};

const LAST_PLAYED_LEVELS_KEY = "lastPlayedLevels";

let languageMessageTimer = null;

function getCoins() {
  const coinsByLanguage = JSON.parse(localStorage.getItem(COINS_KEY) || "{}");
  if (!Number.isFinite(coinsByLanguage[GameState.language])) {
    coinsByLanguage[GameState.language] = STARTING_COINS;
    localStorage.setItem(COINS_KEY, JSON.stringify(coinsByLanguage));
  }
  return coinsByLanguage[GameState.language];
}

function changeCoins(amount, updateDisplay = true) {
  const coinsByLanguage = JSON.parse(localStorage.getItem(COINS_KEY) || "{}");
  const currentCoins = Number.isFinite(coinsByLanguage[GameState.language])
    ? coinsByLanguage[GameState.language]
    : STARTING_COINS;
  coinsByLanguage[GameState.language] = currentCoins + amount;
  localStorage.setItem(COINS_KEY, JSON.stringify(coinsByLanguage));
  if (updateDisplay) updateCoinBalance(amount > 0 ? "gain" : "loss");
}

function updateCoinBalance(animationType = "none") {
  const amount = document.getElementById("coinAmount");
  if (!amount) return;

  const balance = document.getElementById("coinBalance");
  const target = getCoins();

  // Cancel any previous counting animation
  if (amount.coinAnimation) {
    clearInterval(amount.coinAnimation);
    amount.coinAnimation = null;
  }

  if (animationType === "none") {
    amount.dataset.coinValue = String(target);
    amount.textContent = String(target);
    updateHintAvailability();
    return;
  }

  const displayed = Number(amount.dataset.coinValue ?? amount.textContent ?? target);
  const start = Number.isFinite(displayed) ? displayed : target;

  // Already at the target
  if (start === target) {
    amount.dataset.coinValue = String(target);
    amount.textContent = String(target);
    updateHintAvailability();
    return;
  }

  if (balance) {
    balance.classList.remove("coin-balance-gain");

    if (animationType === "gain") {
      void balance.offsetWidth;
      balance.classList.add("coin-balance-gain");
    }
  }

  // Count toward the new balance
  let current = start;
  const direction = target > current ? 1 : -1;

  amount.coinAnimation = setInterval(() => {
    current += direction;

    amount.dataset.coinValue = String(current);
    amount.textContent = String(current);

    if (current === target) {
      clearInterval(amount.coinAnimation);
      amount.coinAnimation = null;
      updateHintAvailability();
    }
  }, 60);
}

function resetProgress() {
  const landmarkProgress = JSON.parse(localStorage.getItem(LANDMARK_STATE_KEY) || "{}");
  const lastPlayed = JSON.parse(localStorage.getItem(LAST_PLAYED_LEVELS_KEY) || "{}");
  delete GameState.levelProgress[GameState.language];
  delete landmarkProgress[GameState.language];
  delete lastPlayed[GameState.language];
  const coinsByLanguage = JSON.parse(localStorage.getItem(COINS_KEY) || "{}");
  delete coinsByLanguage[GameState.language];
  localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(GameState.levelProgress));
  localStorage.setItem(LANDMARK_STATE_KEY, JSON.stringify(landmarkProgress));
  localStorage.setItem(LAST_PLAYED_LEVELS_KEY, JSON.stringify(lastPlayed));
  localStorage.setItem(COINS_KEY, JSON.stringify(coinsByLanguage));
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

  const solved = Object.values(GameState.levelProgress[GameState.language] || {})
    .filter(progress => progress.is_solved).length;
  const total = GameState.questions.length;
  const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;
  const counterState = `${solved}/${total}/${percentage}`;

  if (counterEl.dataset.counterState === counterState) return;

  const shouldAnimate = counterEl.dataset.counterState !== undefined;
  counterEl.dataset.counterState = counterState;

  counterEl.innerHTML = `
    <div class="counter-content${shouldAnimate ? " counter-updated" : ""}" style="--progress: ${percentage}%">
      <strong>${percentage}%</strong>
      <span class="counter-total">${solved}/${total}</span>
    </div>
  `;
}

function getUnsolvedQuestions() {
  const languageProgress = GameState.levelProgress[GameState.language] || {};
  return GameState.questions.filter(question => !languageProgress[question.id]?.is_solved);
}

function getRandomQuestionPool() {
  return getUnsolvedQuestions()
    .sort((first, second) => GameState.difficultyById[first.id] - GameState.difficultyById[second.id])
    .slice(0, 10);
}

function getSolvedCount() {
  return Object.values(GameState.levelProgress[GameState.language] || {})
    .filter(progress => progress.is_solved).length;
}

function getProgressPercentage() {
  const total = GameState.questions.length;
  return total > 0 ? Math.round((getSolvedCount() / total) * 100) : 0;
}

function queueReachedLandmarks() {
  const landmarkProgress = JSON.parse(localStorage.getItem(LANDMARK_STATE_KEY) || "{}");
  const languageState = landmarkProgress[GameState.language] || {
    celebrated: [],
    pending: []
  };
  const percentage = getProgressPercentage();

  languageState.pending = [...new Set([
    ...languageState.pending,
    ...LANDMARKS.filter(mark =>
      mark <= percentage &&
      !languageState.celebrated.includes(mark) &&
      !languageState.pending.includes(mark)
    )
  ])].sort((first, second) => first - second);

  landmarkProgress[GameState.language] = languageState;
  localStorage.setItem(LANDMARK_STATE_KEY, JSON.stringify(landmarkProgress));
}

function showPendingLandmark() {
  const landmarkProgress = JSON.parse(localStorage.getItem(LANDMARK_STATE_KEY) || "{}");
  const languageState = landmarkProgress[GameState.language];
  const landmark = languageState?.pending?.[0];
  if (!landmark) return false;

  languageState.pending.shift();
  languageState.celebrated.push(landmark);
  landmarkProgress[GameState.language] = languageState;
  localStorage.setItem(LANDMARK_STATE_KEY, JSON.stringify(landmarkProgress));
  window.location.href = `landmark.html?percent=${landmark}&language=${GameState.language}`;
  return true;
}

function getHintProgressForQuestion(question) {
  return GameState.levelProgress[GameState.language]?.[question.id] || {
    hintCount: 0,
    revealedIndexes: []
  };
}

function getHintProgress() {
  return getHintProgressForQuestion(GameState.current);
}

function saveHintProgress(revealedIndexes) {
  const languageProgress = GameState.levelProgress[GameState.language] || {};
  const previous = languageProgress[GameState.current.id] || {
    hintCount: 0,
    revealedIndexes: []
  };

  languageProgress[GameState.current.id] = {
    ...previous,
    hintCount: GameState.hintLevel,
    revealedIndexes: [...new Set([...previous.revealedIndexes, ...revealedIndexes])]
  };
  GameState.levelProgress[GameState.language] = languageProgress;
  localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(GameState.levelProgress));
}

function setCurrentQuestion(question) {
  GameState.current = question;
  GameState.currentIndex = GameState.questions.findIndex(item => item.id === question.id);
  GameState.hintLevel = getHintProgressForQuestion(question).hintCount;

  const lastPlayed = JSON.parse(localStorage.getItem(LAST_PLAYED_LEVELS_KEY) || "{}");
  lastPlayed[GameState.language] = question.id;
  localStorage.setItem(LAST_PLAYED_LEVELS_KEY, JSON.stringify(lastPlayed));
}

function selectStartingQuestion() {
  const unsolvedQuestions = getUnsolvedQuestions();
  if (unsolvedQuestions.length === 0) return null;

  const lastPlayed = JSON.parse(localStorage.getItem(LAST_PLAYED_LEVELS_KEY) || "{}");
  const savedQuestion = unsolvedQuestions.find(question => question.id === lastPlayed[GameState.language]);
  const randomPool = getRandomQuestionPool();
  return savedQuestion || randomPool[Math.floor(Math.random() * randomPool.length)];
}

function capitalizeFirstCharacter(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function capitalizeWords(text) {
  return text ? text.replace(/\b[a-z]/g, character => character.toUpperCase()) : text;
}

async function loadQuestions() {
  const fileName = GameState.language === "en" ? "questions-en.json?v=111" : "questions-he.json?v=111";
  const res = await fetch(`data/${fileName}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }
  const data = await res.json();
  GameState.questions = GameState.language === "en"
    ? data.map(question => ({
        ...question,
        category: capitalizeWords(question.category),
        fact: capitalizeFirstCharacter(question.fact),
        answer: question.answer.toUpperCase()
      }))
    : data;
  GameState.difficultyById = Object.fromEntries(
    GameState.questions.map(question => [question.id, calculateDifficulty(question.answer)])
  );

  const questionIds = new Set(GameState.questions.map(question => question.id));
  const languageProgress = GameState.levelProgress[GameState.language] || {};
  const currentProgress = Object.fromEntries(
    Object.entries(languageProgress).filter(([id]) => questionIds.has(id))
  );
  if (Object.keys(currentProgress).length !== Object.keys(languageProgress).length) {
    GameState.levelProgress[GameState.language] = currentProgress;
    localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(GameState.levelProgress));
  }

  updateCounter();
  updateCoinBalance();
}

function checkWinCondition() {
  const unsolvedQuestions = getUnsolvedQuestions();

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

  if (showPendingLandmark()) return;

  setLayoutDirection();
      updateCounter();

  if (GameState.questions.length === 0) return;

  const unsolvedQuestions = getUnsolvedQuestions();

  if (unsolvedQuestions.length === 0) return;

  setCurrentQuestion(selectStartingQuestion());

  void document.body.offsetWidth;
  renderQuestion(GameState.current);
  resetButtons();
  updateResetButtonState();
}

function nextQuestion() {
  if (checkWinCondition()) return;

  if (GameState.questions.length === 0) return;

  // Filter questions that are NOT in the solved list, then keep the 10 easiest.
  const unsolvedQuestions = getRandomQuestionPool();

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

  if (showPendingLandmark()) return;

  setCurrentQuestion(nextQuestion);

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

function updateHintFee() {
  const hintBtn = document.getElementById("hintBtn");
  const hintFee = document.querySelector(".hint-fee");
  if (hintBtn && hintFee) {
    hintFee.hidden = false;
    hintFee.classList.toggle("hint-fee-disabled", hintBtn.disabled);
  }
}

function updateHintAvailability() {
  const hintBtn = document.getElementById("hintBtn");
  if (!hintBtn) return;

  if (GameState.hintLevel >= 2) {
    hintBtn.disabled = true;
    hintBtn.classList.remove("insufficient-funds");
    hintBtn.style.backgroundColor = "#333";
    hintBtn.style.opacity = "0.6";
    hintBtn.style.cursor = "default";
    updateHintFee();
    return;
  }

  hintBtn.classList.toggle("insufficient-funds", getCoins() <= 0 && !hintBtn.disabled);
  if (getCoins() > 0 || hintBtn.disabled) return;

  hintBtn.disabled = false;
  hintBtn.style.backgroundColor = "";
  hintBtn.style.opacity = "";
  hintBtn.style.cursor = "";
  updateHintFee();
}

function blinkCoinBalance() {
  const balance = document.getElementById("coinBalance");
  if (!balance) return;

  balance.classList.remove("coin-balance-insufficient");
  void balance.offsetWidth;
  balance.classList.add("coin-balance-insufficient");
}

function resetButtons() {
  const hintBtn = document.getElementById("hintBtn");
  const resetBtn = document.getElementById("resetBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (nextAttentionTimer) {
    clearTimeout(nextAttentionTimer);
    nextAttentionTimer = null;
  }
  nextBtn.classList.remove("next-attention");

  hintBtn.disabled = false;
  hintBtn.style.backgroundColor = "";
  hintBtn.style.opacity = "";
  hintBtn.style.cursor = "";
  hintBtn.classList.remove("insufficient-funds");
  setButtonLabel(hintBtn, getLocalizedText("hint"));
  hintBtn.style.visibility = "visible";
  updateHintAvailability();
  updateHintFee();

  // Update Reset button: visible, but disabled if no tiles are placed
  resetBtn.style.visibility = "visible";
  setButtonLabel(nextBtn, getLocalizedText("skip"));

  // Initial check for buttons state
  updateResetButtonState();

  // Disable next button if only one unsolved question is left
  const unsolvedQuestions = getUnsolvedQuestions();
  nextBtn.disabled = unsolvedQuestions.length <= 1;

  setButtonLabel(nextBtn, getLocalizedText("skip"));
}

let nextAttentionTimer = null;

function checkAnswer() {
  const user = getUserAnswer();
  const target = normalizeHebrewText(GameState.current.answer.replace(/\s+/g, ""));

  const factBox = document.getElementById("clue");
  const hintBtn = document.getElementById("hintBtn");
  const messageBox = document.getElementById("messageBox");

  function showTemporaryMessage(text, isSuccess = false) {
    factBox.classList.add("hidden");

    const successColor = '#B7FF4A';
    const failColor = '#FF073A';

    messageBox.innerHTML = `<span style="display: inline-block; font-size: 1rem; font-weight: ${isSuccess ? 'normal' : 'normal'}; color: ${isSuccess ? successColor : failColor}; text-shadow: 0 0 10px ${isSuccess ? 'rgba(183, 255, 74, 0.7)' : 'rgba(255, 7, 58, 0.7)'};">${text}</span>`;

    messageBox.style.color = "transparent";
    messageBox.style.fontWeight = "normal";
    messageBox.style.fontSize = "1rem";
    messageBox.style.fontFamily = "inherit";
    messageBox.style.backgroundColor = "transparent";
    messageBox.style.zIndex = "20";
    messageBox.style.pointerEvents = "auto";
    messageBox.style.visibility = "visible";

    messageBox.classList.add("show");

    if (isSuccess) {
      messageBox.classList.remove("success-breath");
      void messageBox.offsetWidth;
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
      successText = GameState.language === "en"
        ? "Well done - solved without hints!"
        : "כל הכבוד - פתרת ללא רמזים!";
    } else if (GameState.hintLevel === 1) {
      successText = GameState.language === "en"
        ? "Nice work - solved with only one hint"
        : "יפה מאוד - פתרת עם רמז אחד בלבד";
    } else {
      successText = GameState.language === "en"
        ? "Good job - solved with two hints"
        : "עבודה טובה - פתרת עם שני רמזים";
    }

    hintBtn.disabled = true;
    hintBtn.classList.remove("insufficient-funds");
    updateHintFee();
    document.getElementById("resetBtn").disabled = true;

    // Disable NEXT during the entire success animation
    const nextBtn = document.getElementById("nextBtn");
    setButtonLabel(nextBtn, getLocalizedText("next"));
    nextBtn.disabled = true;
    nextBtn.classList.remove("next-attention");

    // Cancel any previously scheduled NEXT nudge
    if (nextAttentionTimer) {
      clearTimeout(nextAttentionTimer);
      nextAttentionTimer = null;
    }

    // Apply glow-n-bounce
    const slots = [...document.querySelectorAll(".slot")];

    slots.forEach((slot, index) => {
      setTimeout(() => {
        animateSuccessTile2(slot);
      }, index * 120);
    });

    const animationEndTime = 50 + (slots.length * 120);

    // Show success message after glow-n-bounce
    setTimeout(() => {
      showTemporaryMessage(successText, true);

      if (GameState.hintLevel === 0) {
        triggerFireworks("high");
      }

      // Let the success message finish before revealing each follow-up update.
      setTimeout(() => {
        updateCounter();

        setTimeout(() => {
          updateCoinBalance("gain");

          setTimeout(() => {
            nextBtn.disabled = false;
            nextBtn.classList.remove("next-activated");
            void nextBtn.offsetWidth;
            nextBtn.classList.add("next-activated");

            // Start NEXT nudge 2 seconds after enabling
            nextAttentionTimer = setTimeout(() => {
              nextBtn.classList.add("next-attention");
              nextAttentionTimer = null;
            }, 2000);
          }, 700);
        }, 700);

      }, 1200);

    }, animationEndTime);

    // Mark as solved
    const questionId = GameState.current.id;
    const languageProgress = GameState.levelProgress[GameState.language] || {};
    languageProgress[questionId] = {
      ...(languageProgress[questionId] || {}),
      is_solved: true
    };
    changeCoins(SOLVE_COIN_REWARD, false);
    GameState.levelProgress[GameState.language] = languageProgress;
    localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(GameState.levelProgress));
    queueReachedLandmarks();

    // Disable active marker
    document.querySelectorAll(".slot").forEach(s => {
      s.dataset.active = "false";
      s.dataset.locked = "true";
      s.dataset.solved = "true";
    });

    document.getElementById("clue").style.pointerEvents = "none";

  } else {
    showTemporaryMessage(getLocalizedText("incorrect"));

    const slots = [...document.querySelectorAll(".slot")]
      .filter(slot => slot.dataset.filled === "true");

    slots.forEach(slot => {
      slot.classList.remove("shake");
      void slot.offsetWidth;
      slot.classList.add("shake");
    });

    setTimeout(() => {
      slots.forEach(slot => slot.classList.remove("shake"));
    }, 500);
  }
}

async function showHint() {
  if (getCoins() < HINT_COIN_COST) {
    blinkCoinBalance();
    return;
  }

  changeCoins(-HINT_COIN_COST);
  stopIdleTileBreathing();
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
    updateHintFee();
  } else if (GameState.hintLevel === 3) {
    count = slots.length;
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    document.getElementById("resetBtn").style.visibility = "hidden";
    setButtonLabel(document.getElementById("nextBtn"), getLocalizedText("next"));
    updateHintFee();
  }

  // Animate one by one
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);
  const emptyIndices = slots
    .map((s, i) => (s.dataset.filled === "false" ? i : null))
    .filter(i => i !== null);

  const toReveal = shuffleArray(emptyIndices).slice(0, count);
  saveHintProgress(toReveal);

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
  scheduleIdleTileBreathing();
}

function revealCount(count) {
    // This function is now superseded by logic inside showHint, can be removed or kept as a helper
}

function revealAllLetters() {
  // This function is also now superseded by showHint logic
}
