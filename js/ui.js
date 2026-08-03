// ui.js – Drag & Drop + רינדור UI

let draggedTile = null;

function renderQuestion(question) {
  const pattern = document.getElementById("pattern");
  const scrambleBox = document.getElementById("scramble");
  const factBox = document.getElementById("fact");
  const msgEl = document.getElementById("message");

  pattern.innerHTML = "";
  scrambleBox.innerHTML = "";
  factBox.textContent = "";
  msgEl.textContent = "";

  document.getElementById("hintBtn").disabled = false;

  const clean = question.answer.replace(/\s+/g, "");
  const letters = clean.split("");

  // hint 1: תיבות ריקות מופיעות כבר בהתחלה
  createSlots(question.answer, pattern);

  // אותיות מעורבבות לגרירה
  const shuffled = shuffleArray(letters.slice());
  shuffled.forEach(letter => {
    const tile = document.createElement("div");
    tile.className = "letter";
    tile.textContent = letter;
    tile.draggable = true;
    tile.addEventListener("dragstart", onDragStart);
    scrambleBox.appendChild(tile);
  });
}

function createSlots(answer, container) {
  const chars = answer.split("");
  chars.forEach(ch => {
    if (ch === " ") {
      const spaceSlot = document.createElement("div");
      spaceSlot.className = "slot space";
      container.appendChild(spaceSlot);
    } else {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.filled = "false";
      slot.addEventListener("dragover", e => e.preventDefault());
      slot.addEventListener("drop", onDrop);
      container.appendChild(slot);
    }
  });
}

function onDragStart(e) {
  draggedTile = e.target;
}

function onDrop(e) {
  const slot = e.target;
  if (!slot.classList.contains("slot") || slot.classList.contains("space")) return;
  if (slot.dataset.filled === "true") return;

  slot.textContent = draggedTile.textContent;
  slot.dataset.filled = "true";
  draggedTile.classList.add("hidden");
}

function getUserAnswer() {
  const slots = [...document.querySelectorAll(".slot")].filter(
    s => !s.classList.contains("space")
  );
  return slots.map(s => s.textContent).join("");
}

function revealRandomLetter() {
  const slots = [...document.querySelectorAll(".slot")].filter(
    s => !s.classList.contains("space")
  );
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = clean.split("");

  const emptyIndices = slots
    .map((s, i) => (s.dataset.filled === "false" ? i : null))
    .filter(i => i !== null);

  if (emptyIndices.length === 0) return;

  const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  const slot = slots[idx];
  slot.textContent = letters[idx];
  slot.dataset.filled = "true";

  // להסתיר את אחת האותיות המתאימות מאזור הגרירה
  const tiles = [...document.querySelectorAll(".letter")].filter(
    t => !t.classList.contains("hidden") && t.textContent === letters[idx]
  );
  if (tiles.length > 0) {
    tiles[0].classList.add("hidden");
  }
}

function revealAllLetters() {
  const slots = [...document.querySelectorAll(".slot")].filter(
    s => !s.classList.contains("space")
  );
  const clean = GameState.current.answer.replace(/\s+/g, "");
  const letters = clean.split("");

  slots.forEach((slot, i) => {
    slot.textContent = letters[i];
    slot.dataset.filled = "true";
  });

  const tiles = [...document.querySelectorAll(".letter")];
  tiles.forEach(t => t.classList.add("hidden"));
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
