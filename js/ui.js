// ui.js – Click-to-place UI + רינדור

const HebrewFinalMap = {
  כ: "ך",
  מ: "ם",
  נ: "ן",
  פ: "ף",
  צ: "ץ"
};

const HebrewBaseMap = Object.fromEntries(
  Object.entries(HebrewFinalMap).map(([base, final]) => [final, base])
);

function segmentText(text) {
  if (typeof Intl === "object" && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter("he", { granularity: "grapheme" }).segment(text), s => s.segment);
  }
  return Array.from(text);
}

function toBaseHebrew(letter) {
  return HebrewBaseMap[letter] || letter;
}

function toFinalHebrew(letter) {
  return HebrewFinalMap[letter] || letter;
}

function isFinalSlot(slot) {
  return slot.dataset.final === "true";
}

function placeLetterInSlot(slot, letterBase) {
  slot.dataset.filled = "true";
  slot.dataset.letter = letterBase;
  slot.textContent = isFinalSlot(slot) ? toFinalHebrew(letterBase) : letterBase;
}

function renderQuestion(question) {
  const pattern = document.getElementById("pattern");
  const scrambleBox = document.getElementById("scramble");
  const categoryBox = document.getElementById("category");
  const clueText = document.getElementById("clue-text");
  const cluePrefix = document.querySelector(".clue-prefix");
  const clueContainer = document.querySelector(".clue");

  pattern.innerHTML = "";
  scrambleBox.innerHTML = "";
  categoryBox.textContent = "";
  // Reset clue container properly
  if (clueContainer) {
  clueContainer.classList.add("blurred");
    clueContainer.onclick = () => clueContainer.classList.remove("blurred");

    // Clear inner content first, then restore the structure
    clueContainer.innerHTML = "";

    const prefixSpan = document.createElement("span");
    prefixSpan.className = "clue-prefix";
    prefixSpan.textContent = getLocalizedText("clue");

    const textSpan = document.createElement("span");
    textSpan.className = "clue-text";
    textSpan.id = "clue-text";
    textSpan.textContent = question.fact;

    clueContainer.appendChild(prefixSpan);
    clueContainer.appendChild(textSpan);
  }

  document.getElementById("hintBtn").disabled = false;
  updateResetButtonState();
  const clean = question.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  categoryBox.textContent = `${getLocalizedText("category")}${question.category}`;

  // hint 1: תיבות ריקות מופיעות כבר בהתחלה
  createSlots(question.answer, pattern);

  // Auto-fit: compute the longest line and set --slot-size so slots scale to pattern width
  (function autoFitSlots() {
    const lines = Array.from(pattern.querySelectorAll('.slot-line'));
    if (lines.length === 0) return;

    let maxSlots = 0;
    lines.forEach(l => { maxSlots = Math.max(maxSlots, l.children.length); });
    const containerWidth = pattern.clientWidth || pattern.offsetWidth || 300;

    const slotMargin = 8; // left + right
    const slotBorder = 4; // total horizontal border width
    const gap = 4;
    const totalGap = Math.max(0, maxSlots - 1) * gap;
    const available = containerWidth - totalGap - maxSlots * slotMargin - slotBorder;
    let computed = Math.floor(available / Math.max(1, maxSlots));

    const minSize = 28;
    const maxSize = 45;
    computed = Math.max(minSize, Math.min(maxSize, computed));
    pattern.style.setProperty('--slot-size', computed + 'px');
  })();

  // אותיות מעורבבות ללחיצה
  const shuffled = shuffleArray(letters.slice());
  const rows = splitIntoRows(shuffled, 6);

  rows.forEach(rowLetters => {
    const row = document.createElement("div");
    row.className = "scramble-row";

    rowLetters.forEach(letter => {
      const tile = document.createElement("div");
      tile.className = "letter";
      tile.dataset.base = toBaseHebrew(letter);
      tile.textContent = toBaseHebrew(letter);
      tile.addEventListener("click", onLetterClick);
      row.appendChild(tile);
    });

    scrambleBox.appendChild(row);
  });
}

function splitIntoRows(items, maxPerRow) {
  const rowCount = Math.max(1, Math.ceil(items.length / maxPerRow));
  const baseCount = Math.floor(items.length / rowCount);
  const remainder = items.length % rowCount;
  const rows = [];
  let cursor = 0;

  for (let i = 0; i < rowCount; i++) {
    const count = baseCount + (i < remainder ? 1 : 0);
    rows.push(items.slice(cursor, cursor + count));
    cursor += count;
  }

  return rows;
}

function createSlots(answer, container) {
  // --- 1. Smart grouping: merge words until total chars > 7 ---
  function groupWordsMax7(words) {
    const lines = [];
    let current = [];

    for (const w of words) {
      const test = [...current, w].join(" ");
      if (test.length <= 7) {
        current.push(w);
      } else {
        if (current.length) lines.push(current);
        current = [w];
      }
    }

    if (current.length) lines.push(current);
    return lines;
  }

  const words = answer.split(" ");
  const grouped = groupWordsMax7(words);

  // --- 2. Build slot lines based on grouped words ---
  grouped.forEach((group, index) => {
    const line = document.createElement("div");
    line.className = "slot-line";

    group.forEach((word, wordIndex) => {
      const letters = segmentText(word);

      letters.forEach((letter, letterIndex) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.filled = "false";
        slot.dataset.final = letterIndex === letters.length - 1 ? "true" : "false";
        slot.addEventListener("click", onSlotClick);
        line.appendChild(slot);
      });

      // Insert gap between words (NOT tiles)
      if (wordIndex < group.length - 1) {
        const gap = document.createElement("div");
        gap.className = "word-gap";
        line.appendChild(gap);
      }
    });

    container.appendChild(line);

    // Gap between lines
    if (index < grouped.length - 1) {
      const gap = document.createElement("div");
      gap.className = "line-gap";
      container.appendChild(gap);
    }
  });
}

function onLetterClick(e) {
  const tile = e.currentTarget;
  const factBox = document.getElementById("clue");

  if (factBox.textContent === "מעולה! תשובה נכונה.") {
    return;
  }

  const slots = [...document.querySelectorAll(".slot")].filter(
    s => s.dataset.filled === "false"
  );
  if (slots.length === 0) return;

  const letterBase = tile.dataset.base || toBaseHebrew(tile.textContent);
  const slot = slots[0];
  placeLetterInSlot(slot, letterBase);

  tile.dataset.letter = letterBase;
  tile.textContent = "";
  tile.classList.add("empty");
  tile.removeEventListener("click", onLetterClick);
  tile.style.cursor = "default";

  updateResetButtonState();

  const allSlotsFilled = [...document.querySelectorAll(".slot")].every(
    s => s.dataset.filled === "true"
  );

  if (allSlotsFilled) {
    checkAnswer();
  }
}

function onSlotClick(e) {
  const slot = e.currentTarget;
  const factBox = document.getElementById("clue");

  if (factBox.textContent === "מעולה! תשובה נכונה." || factBox.textContent === "לא מדויק, נסה שוב.") {
    return;
  }

  if (slot.dataset.filled !== "true" || slot.dataset.locked === "true") return;

  const letter = slot.dataset.letter || toBaseHebrew(slot.textContent);
  slot.textContent = "";
  slot.dataset.filled = "false";
  slot.removeAttribute("data-letter");

  const tiles = [...document.querySelectorAll(".letter")].filter(
    t => t.dataset.letter === letter && t.classList.contains("empty")
  );
  if (tiles.length > 0) {
    const tile = tiles[0];
    tile.textContent = toBaseHebrew(letter);
    tile.dataset.base = toBaseHebrew(letter);
    tile.removeAttribute("data-letter");
    tile.classList.remove("empty");
    tile.addEventListener("click", onLetterClick);
    tile.style.cursor = "grab";
  }

  updateResetButtonState();
}

function getUserAnswer() {
  const slots = [...document.querySelectorAll(".slot")];
  return slots.map(s => toBaseHebrew(s.textContent)).join("");
}

function clearBoardForHint() {
  const slots = [...document.querySelectorAll(".slot")];
  const tiles = [...document.querySelectorAll(".letter")];

  slots.forEach(slot => {
    // Only clear if not locked
    if (slot.dataset.locked !== "true") {
      slot.textContent = "";
      slot.dataset.filled = "false";
      slot.removeAttribute("data-letter");
    }
  });

  tiles.forEach(tile => {
    // Only return if not locked
    if (tile.dataset.letter && tile.dataset.locked !== "true") {
      tile.textContent = tile.dataset.letter;
      tile.removeAttribute("data-letter");
      tile.classList.remove("empty", "disabled");
      tile.style.cursor = "grab";
      tile.addEventListener("click", onLetterClick);
    }
  });
}

function resetPlacement() {
  const slots = [...document.querySelectorAll(".slot")];
  const tiles = [...document.querySelectorAll(".letter")];
  slots.forEach(slot => {
    if (slot.dataset.filled === "true" && slot.dataset.locked !== "true") {
      slot.textContent = "";
      slot.dataset.filled = "false";
      slot.removeAttribute("data-letter");
    }
  });

  tiles.forEach(tile => {
    if (tile.dataset.letter && tile.dataset.locked !== "true") {
      tile.textContent = tile.dataset.letter;
      tile.removeAttribute("data-letter");
      tile.classList.remove("empty", "disabled");
      tile.style.cursor = "grab";
      tile.addEventListener("click", onLetterClick);
    }
  });

  updateResetButtonState();
}

function revealRandomLetter() {
  const slots = [...document.querySelectorAll(".slot")];
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  const emptyIndices = slots
    .map((s, i) => (s.dataset.filled === "false" ? i : null))
    .filter(i => i !== null);

  if (emptyIndices.length === 0) return;

  const totalLetters = letters.length;
  const revealCount = Math.max(1, Math.ceil(totalLetters * 0.3));
  const indicesToReveal = shuffleArray(emptyIndices).slice(0, revealCount);

  indicesToReveal.forEach(idx => {
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
}

function revealAllLetters() {
  const slots = [...document.querySelectorAll(".slot")];
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  slots.forEach((slot, i) => {
    const letterBase = toBaseHebrew(letters[i]);
    placeLetterInSlot(slot, letterBase);
    slot.dataset.locked = "true";
  });

  const tiles = [...document.querySelectorAll(".letter")];
  tiles.forEach(t => {
    if (t.dataset.base) {
      t.dataset.letter = t.dataset.base;
    } else if (t.textContent) {
      t.dataset.letter = toBaseHebrew(t.textContent);
    }
    t.textContent = "";
    t.classList.add("empty");
    t.removeEventListener("click", onLetterClick);
    t.style.cursor = "default";
  });

  updateResetButtonState();
}

function updateResetButtonState() {
  const anyPlaced = [...document.querySelectorAll(".slot")].some(
    s => s.dataset.filled === "true" && s.dataset.locked !== "true"
  );
  const resetBtn = document.getElementById("resetBtn");
  resetBtn.disabled = !anyPlaced;
  resetBtn.style.visibility = anyPlaced ? "visible" : "hidden";
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

