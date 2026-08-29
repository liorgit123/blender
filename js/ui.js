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
  // Wrap content in a span so we can animate it
  slot.innerHTML = `<span class="slot-text">${isFinalSlot(slot) ? toFinalHebrew(letterBase) : letterBase}</span>`;
}

function renderQuestion(question) {
  const pattern = document.getElementById("pattern");
  const scrambleBox = document.getElementById("scramble");
  const categoryBox = document.getElementById("category");
  const messageBox = document.getElementById("messageBox");
  const clueContainer = document.querySelector(".clue");
  updateCounter(); // Add this to ensure it's updated when question changes

  pattern.innerHTML = "";
  scrambleBox.innerHTML = "";
  messageBox.textContent = "";
  messageBox.classList.remove("show"); // Ensure message is hidden
  messageBox.style.visibility = "hidden"; // Also ensure visibility is hidden

  // Ensure clue is visible
  if (clueContainer) {
    clueContainer.classList.remove("hidden");
    clueContainer.style.pointerEvents = "auto"; // Ensure it's re-enabled
  }

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

  categoryBox.innerHTML = `<span class="category-prefix">${getLocalizedText("category")}</span><span class="category-value">${question.category}</span>`;
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

      // Merge logic: use a single handler that checks the state
      tile.addEventListener("click", handleTileClick);
      row.appendChild(tile);
    });

    scrambleBox.appendChild(row);
  });
}

function handleTileClick(e) {
  const tile = e.currentTarget;
    if (tile.classList.contains("empty")) {
        onEmptyLetterClick(e);
  } else {
        onLetterClick(e);
}
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
        slot.dataset.active = "false"; // New property for marker
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

  // Set default active slot
  updateActiveSlot();
}

function updateActiveSlot(specificSlot = null) {
  const slots = [...document.querySelectorAll(".slot")];
  // Clear all
  slots.forEach(s => s.dataset.active = "false");

  if (specificSlot) {
    specificSlot.dataset.active = "true";
    return;
  }

  const firstEmpty = slots.find(s => s.dataset.filled === "false");

  // Set first empty
  if (firstEmpty) {
    firstEmpty.dataset.active = "true";
  }
}

function updateActiveSlotAfterPlacement(lastPlacedSlot) {
  const slots = [...document.querySelectorAll(".slot")];
  const currentIndex = slots.indexOf(lastPlacedSlot);

  // Find next empty slot after the current one
  let nextEmpty = null;
  for (let i = currentIndex + 1; i < slots.length; i++) {
    if (slots[i].dataset.filled === "false") {
      nextEmpty = slots[i];
      break;
    }
  }

  // If no empty slot found after, look from the beginning
  if (!nextEmpty) {
    nextEmpty = slots.find(s => s.dataset.filled === "false");
  }

  // Clear all
  slots.forEach(s => s.dataset.active = "false");

  if (nextEmpty) {
    nextEmpty.dataset.active = "true";
  }
}
function isGameWon() {
  const factBox = document.getElementById("clue");
  return factBox && factBox.querySelector(".fact-check") !== null;
}

function onSlotClick(e) {
  const slot = e.currentTarget;
  if (isGameWon() || slot.dataset.locked === "true") return;

  if (slot.dataset.filled === "false") {
    updateActiveSlot(slot);
    return;
  }

  const letterBase = slot.dataset.letter;
  // Find the source tile that matches this letter
  const originalTile = [...document.querySelectorAll(".letter")].find(
    t => t.classList.contains("empty") && (t.dataset.base === letterBase || t.dataset.letter === letterBase)
  );

  const letterSpan = slot.querySelector(".slot-text");

  if (originalTile && letterSpan) {
    // Fade out only the letter span
    letterSpan.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 1000, easing: 'ease-out' }
    ).onfinish = () => {
    // Restore tile immediately
      originalTile.textContent = letterBase;
    originalTile.dataset.base = letterBase;
      originalTile.classList.remove("empty");
      originalTile.removeAttribute("data-letter");

    // Clear slot
  slot.textContent = "";
  slot.dataset.filled = "false";
  slot.removeAttribute("data-letter");
  updateResetButtonState();
  updateActiveSlot();
    };
}
  }

function onLetterClick(e) {
  const tile = e.currentTarget;
  if (isGameWon() || tile.classList.contains("empty")) return;

  let targetSlot = document.querySelector(".slot[data-active='true']");
  if (!targetSlot || targetSlot.dataset.filled === "true") {
    targetSlot = [...document.querySelectorAll(".slot")].find(s => s.dataset.filled === "false");
  }
  if (!targetSlot) return;

  // Ensure dataset.letter is correctly set
  const letterToMove = tile.dataset.base || toBaseHebrew(tile.textContent);
  tile.dataset.letter = letterToMove;

  // Mark as empty immediately
      tile.classList.add("empty");
      tile.textContent = "";

  // Place in slot
  placeLetterInSlot(targetSlot, letterToMove);

  // Re-add fade animation
  const letterSpan = targetSlot.querySelector(".slot-text");
  if (letterSpan) {
    letterSpan.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, easing: 'ease-in-out' }
    );
}

  updateActiveSlotAfterPlacement(targetSlot);
  updateResetButtonState();
  if ([...document.querySelectorAll(".slot")].every(s => s.dataset.filled === "true")) checkAnswer();
}

function onEmptyLetterClick(e) {
  const tile = e.currentTarget;
  if (isGameWon() || !tile.classList.contains("empty") || !tile.dataset.letter) return;

  const letter = tile.dataset.letter;

  // Find slot with this letter
  const slot = [...document.querySelectorAll(".slot")].find(s =>
      s.dataset.filled === "true" &&
      s.dataset.letter === letter &&
      s.dataset.locked !== "true"
  );

  if (!slot) return;

  slot.textContent = "";
  slot.dataset.filled = "false";
  slot.removeAttribute("data-letter");

  // Restore tile
  tile.textContent = letter;
  tile.dataset.base = letter; // Ensure base is set
  tile.classList.remove("empty");
  tile.removeAttribute("data-letter");
  updateResetButtonState();
  updateActiveSlot();
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
  updateActiveSlot();

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
  updateActiveSlot();

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
  updateActiveSlot();
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
  updateActiveSlot();

  updateResetButtonState();
}

function updateResetButtonState() {
  const anyPlaced = [...document.querySelectorAll(".slot")].some(
    s => s.dataset.filled === "true" && s.dataset.locked !== "true"
  );
  const resetBtn = document.getElementById("resetBtn");
  resetBtn.disabled = !anyPlaced;
  resetBtn.style.visibility = "visible";
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

