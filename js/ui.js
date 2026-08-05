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
  const factBox = document.getElementById("fact");

  pattern.innerHTML = "";
  scrambleBox.innerHTML = "";
  categoryBox.textContent = "";
  factBox.textContent = "";

  document.getElementById("hintBtn").disabled = false;
  updateResetButtonState();

  const clean = question.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  categoryBox.textContent = `קטגוריה: ${question.category}`;

  // hint 1: תיבות ריקות מופיעות כבר בהתחלה
  createSlots(question.answer, pattern);

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
  const words = answer.split(" ");

  words.forEach((word, index) => {
    const letters = segmentText(word);
    const line = document.createElement("div");
    line.className = "slot-line";

    letters.forEach((letter, letterIndex) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.filled = "false";
      slot.dataset.final = letterIndex === letters.length - 1 ? "true" : "false";
      slot.addEventListener("click", onSlotClick);
      line.appendChild(slot);
    });

    container.appendChild(line);

    if (index < words.length - 1) {
      const gap = document.createElement("div");
      gap.className = "line-gap";
      container.appendChild(gap);
    }
  });
}

function onLetterClick(e) {
  const tile = e.currentTarget;
  const factBox = document.getElementById("fact");

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
  const factBox = document.getElementById("fact");

  if (factBox.textContent === "מעולה! תשובה נכונה." || factBox.textContent === "לא מדויק, נסה שוב.") {
    return;
  }

  if (slot.dataset.filled !== "true") return;

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
    slot.textContent = "";
    slot.dataset.filled = "false";
    slot.removeAttribute("data-letter");
  });

  tiles.forEach(tile => {
    if (tile.dataset.letter) {
      tile.textContent = tile.dataset.letter;
      tile.removeAttribute("data-letter");
    }
    tile.classList.remove("empty", "disabled");
    tile.style.cursor = "grab";
    tile.addEventListener("click", onLetterClick);
  });
}

function resetPlacement() {
  const slots = [...document.querySelectorAll(".slot")];
  const tiles = [...document.querySelectorAll(".letter")];

  slots.forEach(slot => {
    if (slot.dataset.filled === "true") {
      slot.textContent = "";
      slot.dataset.filled = "false";
      slot.removeAttribute("data-letter");
    }
  });

  tiles.forEach(tile => {
    if (tile.dataset.letter) {
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

    const tiles = [...document.querySelectorAll(".letter")].filter(
      t => !t.classList.contains("empty") && t.dataset.base === letterBase
    );
    if (tiles.length > 0) {
      const tile = tiles[0];
      tile.dataset.letter = letterBase;
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
    s => s.dataset.filled === "true"
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
