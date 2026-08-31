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
    return Array.from(
      new Intl.Segmenter("he", { granularity: "grapheme" }).segment(text),
      s => s.segment
    );
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

  slot.innerHTML = `
    <span class="slot-text">
      ${isFinalSlot(slot) ? toFinalHebrew(letterBase) : letterBase}
    </span>
  `;
}


/* =========================================================
   BLUE TILE ANIMATION HELPERS
   ========================================================= */

/*
 * Creates a temporary blue tile overlay.
 *
 * The important part is that this function creates the clone
 * while the tile is visually a NORMAL blue tile, not an empty
 * dark-blue tile. This guarantees the letter has the correct
 * font size and dimensions from the very first frame.
 */
function createBlueTileOverlay(tile, letter) {
  const rect = tile.getBoundingClientRect();

  // Clone the tile
  const overlay = tile.cloneNode(true);

  // Temporarily make the clone a normal blue tile
  overlay.classList.remove("empty", "disabled");

  // Restore the letter
  overlay.textContent = letter;
  overlay.dataset.base = letter;
  overlay.removeAttribute("data-letter");

  // Copy the computed visual properties from the normal tile.
  // The original tile is currently empty/dark, so we temporarily
  // need the styles that the normal .letter state would have.
  const originalHadEmpty = tile.classList.contains("empty");
  const originalText = tile.textContent;

  if (originalHadEmpty) {
    tile.classList.remove("empty");
    tile.textContent = letter;
  }

  const computedStyle = getComputedStyle(tile);

  [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "color",
    "background",
    "backgroundColor",
    "border",
    "borderRadius",
    "boxShadow",
    "boxSizing",
    "padding"
  ].forEach(prop => {
    overlay.style[prop] = computedStyle[prop];
  });

  // Restore the original tile exactly as it was
  if (originalHadEmpty) {
    tile.classList.add("empty");
    tile.textContent = originalText;
  }

  overlay.style.position = "fixed";
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.margin = "0";
  overlay.style.zIndex = "1000";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";

  document.body.appendChild(overlay);

  return overlay;
}


/*
 * Fade a normal blue tile back in over the dark-blue tile.
 *
 * The original tile remains .empty for the ENTIRE animation.
 * This is what prevents the dark-blue tile from disappearing.
 */
function fadeTileBackIn(tile, letter) {
  // Keep the original dark-blue tile untouched.

  const overlay = createBlueTileOverlay(tile, letter);

  const animation = animateScaleInSimple(overlay, 300);

  animation.onfinish = () => {
    /*
     * At this exact point the overlay is fully opaque.
     * Therefore changing the original tile underneath it
     * cannot produce a visible flash.
     */

    tile.textContent = letter;
    tile.dataset.base = letter;
    tile.classList.remove("empty");
    tile.removeAttribute("data-letter");
    tile.style.opacity = "1";

    overlay.remove();
  };
}


/* =========================================================
   RENDER QUESTION
   ========================================================= */

function renderQuestion(question) {
  const pattern = document.getElementById("pattern");
  const scrambleBox = document.getElementById("scramble");
  const categoryBox = document.getElementById("category");
  const messageBox = document.getElementById("messageBox");
  const clueContainer = document.querySelector(".clue");

  updateCounter();

  pattern.innerHTML = "";
  scrambleBox.innerHTML = "";

  messageBox.textContent = "";
  messageBox.classList.remove("show");
  messageBox.style.visibility = "hidden";

  // Ensure clue is visible
  if (clueContainer) {
    clueContainer.classList.remove("hidden");
    clueContainer.style.pointerEvents = "auto";
  }

  categoryBox.textContent = "";

  if (clueContainer) {
    clueContainer.innerHTML = "";

    const textSpan = document.createElement("span");
    textSpan.className = "clue-text";
      textSpan.id = "clue-text";
      textSpan.textContent = question.fact;

      clueContainer.appendChild(textSpan);
    }

  document.getElementById("hintBtn").disabled = false;

  updateResetButtonState();

  const clean = question.answer.replace(/\s+/g, "");
  const letters = segmentText(clean);

  categoryBox.innerHTML = `
    <span class="category-prefix">${getLocalizedText("category")}</span>
    <span class="category-value">${question.category}</span>
  `;

  createSlots(question.answer, pattern);

  // Auto-fit
  (function autoFitSlots() {
    const lines = Array.from(
      pattern.querySelectorAll(".slot-line")
    );

    if (lines.length === 0) return;

    let maxSlots = 0;

    lines.forEach(l => {
      maxSlots = Math.max(maxSlots, l.children.length);
    });

    const containerWidth =
      pattern.clientWidth ||
      pattern.offsetWidth ||
      300;

    const slotMargin = 8;
    const slotBorder = 4;
    const gap = 4;

    const totalGap =
      Math.max(0, maxSlots - 1) * gap;

    const available =
      containerWidth -
      totalGap -
      maxSlots * slotMargin -
      slotBorder;

    let computed = Math.floor(
      available / Math.max(1, maxSlots)
    );

    const minSize = 28;
    const maxSize = 45;

    computed = Math.max(
      minSize,
      Math.min(maxSize, computed)
    );

    pattern.style.setProperty(
      "--slot-size",
      computed + "px"
    );
  })();

  // Scrambled letters
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

      tile.addEventListener("click", handleTileClick);

      row.appendChild(tile);
    });

    scrambleBox.appendChild(row);
  });
}


/* =========================================================
   TILE CLICK
   ========================================================= */

function handleTileClick(e) {
  const tile = e.currentTarget;

  if (tile.classList.contains("empty")) {
    onEmptyLetterClick(e);
  } else {
    onLetterClick(e);
  }
}


/* =========================================================
   ROW LAYOUT
   ========================================================= */

function splitIntoRows(items, maxPerRow) {
  const rowCount = Math.max(
    1,
    Math.ceil(items.length / maxPerRow)
  );

  const baseCount = Math.floor(
    items.length / rowCount
  );

  const remainder = items.length % rowCount;

  const rows = [];
  let cursor = 0;

  for (let i = 0; i < rowCount; i++) {
    const count =
      baseCount +
      (i < remainder ? 1 : 0);

    rows.push(
      items.slice(cursor, cursor + count)
    );

    cursor += count;
  }

  return rows;
}


/* =========================================================
   CREATE SLOTS
   ========================================================= */

function createSlots(answer, container) {

  function groupWordsMax7(words) {
    const lines = [];
    let current = [];

    for (const w of words) {
      const test = [...current, w].join(" ");

      if (test.length <= 7) {
        current.push(w);
      } else {
        if (current.length) {
          lines.push(current);
        }

        current = [w];
      }
    }

    if (current.length) {
      lines.push(current);
    }

    return lines;
  }

  const words = answer.split(" ");
  const grouped = groupWordsMax7(words);

  grouped.forEach((group, index) => {
    const line = document.createElement("div");
    line.className = "slot-line";

    group.forEach((word, wordIndex) => {
      const letters = segmentText(word);

      letters.forEach((letter, letterIndex) => {
        const slot = document.createElement("div");

        slot.className = "slot";
        slot.dataset.filled = "false";
        slot.dataset.final =
          letterIndex === letters.length - 1
            ? "true"
            : "false";

        slot.dataset.active = "false";

        slot.addEventListener(
          "click",
          onSlotClick
        );

        line.appendChild(slot);
      });

      // Word gap
      if (wordIndex < group.length - 1) {
        const gap = document.createElement("div");
        gap.className = "word-gap";
        line.appendChild(gap);
      }
    });

    container.appendChild(line);

    // Line gap
    if (index < grouped.length - 1) {
      const gap = document.createElement("div");
      gap.className = "line-gap";
      container.appendChild(gap);
    }
  });

  updateActiveSlot();
}


/* =========================================================
   ACTIVE SLOT
   ========================================================= */

function updateActiveSlot(specificSlot = null) {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  slots.forEach(
    s => s.dataset.active = "false"
  );

  if (specificSlot) {
    specificSlot.dataset.active = "true";
    return;
  }

  const firstEmpty = slots.find(
    s => s.dataset.filled === "false"
  );

  if (firstEmpty) {
    firstEmpty.dataset.active = "true";
  }
}


function updateActiveSlotAfterPlacement(lastPlacedSlot) {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  const currentIndex =
    slots.indexOf(lastPlacedSlot);

  let nextEmpty = null;

  for (
    let i = currentIndex + 1;
    i < slots.length;
    i++
  ) {
    if (
      slots[i].dataset.filled === "false"
    ) {
      nextEmpty = slots[i];
      break;
    }
  }

  if (!nextEmpty) {
    nextEmpty = slots.find(
      s => s.dataset.filled === "false"
    );
  }

  slots.forEach(
    s => s.dataset.active = "false"
  );

  if (nextEmpty) {
    nextEmpty.dataset.active = "true";
  }
}


/* =========================================================
   GAME WON
   ========================================================= */

function isGameWon() {
  const factBox =
    document.getElementById("clue");

  return (
    factBox &&
    factBox.querySelector(".fact-check") !== null
  );
}


/* =========================================================
   CLICK WHITE SLOT TO RETURN LETTER
   ========================================================= */

function onSlotClick(e) {
  const slot = e.currentTarget;

  if (
    isGameWon() ||
    slot.dataset.locked === "true"
  ) {
    return;
  }

  if (slot.dataset.filled === "false") {
    updateActiveSlot(slot);
    return;
  }

  const letterBase = slot.dataset.letter;

  const originalTile = [
    ...document.querySelectorAll(".letter")
  ].find(
    t =>
      t.classList.contains("empty") &&
      (
        t.dataset.base === letterBase ||
        t.dataset.letter === letterBase
      )
  );

  const letterSpan =
    slot.querySelector(".slot-text");

  if (originalTile && letterSpan) {

    // Start both animations in parallel
    //const fadeOutAnimation = animateScaleOut(letterSpan, 3000);

    // Fade the tile back in (this function has its own animation)
    fadeTileBackIn(
      originalTile,
      letterBase
    );

    // Clear white slot immediately
    slot.textContent = "";
    slot.dataset.filled = "false";
    slot.removeAttribute("data-letter");

  updateResetButtonState();
    updateActiveSlot();
}
}


/* =========================================================
   CLICK BLUE TILE TO PLACE LETTER
   ========================================================= */

function onLetterClick(e) {
  const tile = e.currentTarget;

  if (
    isGameWon() ||
    tile.classList.contains("empty")
  ) {
    return;
  }

  let targetSlot =
    document.querySelector(
      ".slot[data-active='true']"
      );

  if (
    !targetSlot ||
    targetSlot.dataset.filled === "true"
  ) {
    targetSlot = [
      ...document.querySelectorAll(".slot")
    ].find(
      s => s.dataset.filled === "false"
    );
  }

  if (!targetSlot) return;

  const letterToMove =
    tile.dataset.base ||
    toBaseHebrew(tile.textContent);

  tile.dataset.letter = letterToMove;

  /*
   * Create a blue visual copy.
   * The real tile immediately becomes the dark-blue
   * background underneath it.
   */
  const fadeTile = tile.cloneNode(true);

  const computedStyle =
    getComputedStyle(tile);

  [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "color",
    "background",
    "backgroundColor",
    "border",
    "borderRadius",
    "boxShadow",
    "boxSizing",
    "padding"
  ].forEach(prop => {
    fadeTile.style[prop] =
      computedStyle[prop];
  });

  fadeTile.classList.remove(
    "empty",
    "disabled"
  );

  fadeTile.textContent = letterToMove;

  fadeTile.style.position = "fixed";

  const rect =
    tile.getBoundingClientRect();

  fadeTile.style.left =
    `${rect.left}px`;

  fadeTile.style.top =
    `${rect.top}px`;

  fadeTile.style.width =
    `${rect.width}px`;

  fadeTile.style.height =
    `${rect.height}px`;

  fadeTile.style.margin = "0";
  fadeTile.style.zIndex = "1000";
  fadeTile.style.pointerEvents = "none";

  document.body.appendChild(fadeTile);

  /*
   * IMPORTANT:
   * The original tile becomes dark-blue immediately,
   * BEFORE the fade starts.
   */
  tile.classList.add("empty");
  tile.textContent = "";
  tile.style.opacity = "1";

  /*
   * Fade the blue copy away.
   * The dark-blue tile is already underneath it.
   */
  
  const animation = animateScaleOut(fadeTile, 200);

  animation.onfinish = () => {
    fadeTile.remove();
  };

  // Place letter in white slot
  placeLetterInSlot(
    targetSlot,
    letterToMove
  );

  const letterSpan =
    targetSlot.querySelector(".slot-text");

  if (letterSpan) {
    animateScaleIn(letterSpan, 350);
  }

  updateActiveSlotAfterPlacement(
    targetSlot
  );

  updateResetButtonState();

  if (
    [...document.querySelectorAll(".slot")]
      .every(
        s =>
          s.dataset.filled === "true"
      )
  ) {
    checkAnswer();
  }
}


/* =========================================================
   CLICK EMPTY/DARK BLUE TILE TO RETURN LETTER
   ========================================================= */

function onEmptyLetterClick(e) {
  const tile = e.currentTarget;

  if (
    isGameWon() ||
    !tile.classList.contains("empty") ||
    !tile.dataset.letter
  ) {
    return;
  }

  const letter = tile.dataset.letter;

  const slot = [
    ...document.querySelectorAll(".slot")
  ].find(
    s =>
      s.dataset.filled === "true" &&
      s.dataset.letter === letter &&
      s.dataset.locked !== "true"
  );

  if (!slot) return;

  /*
   * First clear the white slot.
   */
  slot.textContent = "";
  slot.dataset.filled = "false";
  slot.removeAttribute("data-letter");

  /*
   * The original tile stays DARK BLUE.
   *
   * fadeTileBackIn creates a blue overlay and fades
   * that overlay in. Only after the animation is complete
   * does it convert the original tile back to blue.
   */
  fadeTileBackIn(tile, letter);

  updateResetButtonState();
  updateActiveSlot();
}


/* =========================================================
   USER ANSWER
   ========================================================= */

function getUserAnswer() {
  const slots = [...document.querySelectorAll(".slot")];

  return slots
    .map(slot => {
      if (slot.dataset.filled !== "true") return "";
      return toBaseHebrew(slot.dataset.letter || "");
    })
    .join("");
}


/* =========================================================
   HINT
   ========================================================= */

function clearBoardForHint() {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  const tiles = [
    ...document.querySelectorAll(".letter")
  ];

  slots.forEach(slot => {
    if (
      slot.dataset.locked !== "true"
    ) {
      slot.textContent = "";
      slot.dataset.filled = "false";
      slot.removeAttribute("data-letter");
    }
  });

  updateActiveSlot();

  tiles.forEach(tile => {
    if (
      tile.dataset.letter &&
      tile.dataset.locked !== "true"
    ) {
      tile.textContent =
        tile.dataset.letter;

      tile.removeAttribute(
        "data-letter"
      );

      tile.classList.remove(
        "empty",
        "disabled"
      );

      tile.style.cursor = "grab";

      tile.addEventListener(
        "click",
        onLetterClick
      );
    }
  });
}


function resetPlacement() {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  const tiles = [
    ...document.querySelectorAll(".letter")
  ];

  slots.forEach(slot => {
    if (
      slot.dataset.filled === "true" &&
      slot.dataset.locked !== "true"
    ) {
      slot.textContent = "";
      slot.dataset.filled = "false";
      slot.removeAttribute("data-letter");
    }
  });

  updateActiveSlot();

  tiles.forEach(tile => {
    if (
      tile.dataset.letter &&
      tile.dataset.locked !== "true"
    ) {
      tile.textContent =
        tile.dataset.letter;

      tile.removeAttribute(
        "data-letter"
      );

      tile.classList.remove(
        "empty",
        "disabled"
      );

      tile.style.cursor = "grab";

      tile.addEventListener(
        "click",
        onLetterClick
      );
    }
  });

  updateResetButtonState();
}


/* =========================================================
   REVEAL RANDOM LETTER
   ========================================================= */

function revealRandomLetter() {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  const clean =
    GameState.current.answer
      .replace(/\s+/g, "");

  const letters = segmentText(clean);

  const emptyIndices = slots
    .map(
      (s, i) =>
        s.dataset.filled === "false"
          ? i
          : null
    )
    .filter(
      i => i !== null
    );

  if (emptyIndices.length === 0) {
    return;
  }

  const totalLetters =
    letters.length;

  const revealCount =
    Math.max(
      1,
      Math.ceil(totalLetters * 0.3)
    );

  const indicesToReveal =
    shuffleArray(emptyIndices)
      .slice(0, revealCount);

  indicesToReveal.forEach(idx => {
    const slot = slots[idx];

    const letterBase =
      toBaseHebrew(letters[idx]);

    placeLetterInSlot(
      slot,
      letterBase
    );

    slot.dataset.locked = "true";

    const tiles = [
      ...document.querySelectorAll(".letter")
    ].filter(
      t =>
        !t.classList.contains("empty") &&
        t.dataset.base === letterBase
    );

    if (tiles.length > 0) {
      const tile = tiles[0];

      tile.dataset.letter =
        letterBase;

      tile.dataset.locked = "true";

      tile.textContent = "";

      tile.classList.add("empty");

      tile.removeEventListener(
        "click",
        onLetterClick
      );

      tile.style.cursor = "default";
    }
  });

  updateActiveSlot();
}


/* =========================================================
   REVEAL ALL
   ========================================================= */

function revealAllLetters() {
  const slots = [
    ...document.querySelectorAll(".slot")
  ];

  const clean =
    GameState.current.answer
      .replace(/\s+/g, "");

  const letters =
    segmentText(clean);

  slots.forEach((slot, i) => {
    const letterBase =
      toBaseHebrew(letters[i]);

    placeLetterInSlot(
      slot,
      letterBase
    );

    slot.dataset.locked = "true";
  });

  const tiles = [
    ...document.querySelectorAll(".letter")
  ];

  tiles.forEach(t => {
    if (t.dataset.base) {
      t.dataset.letter =
        t.dataset.base;
    } else if (t.textContent) {
      t.dataset.letter =
        toBaseHebrew(t.textContent);
    }

    t.textContent = "";

    t.classList.add("empty");

    t.removeEventListener(
      "click",
      onLetterClick
    );

    t.style.cursor = "default";
  });

  updateActiveSlot();
  updateResetButtonState();
}


/* =========================================================
   RESET BUTTON
   ========================================================= */

function updateResetButtonState() {
  const anyPlaced = [
    ...document.querySelectorAll(".slot")
  ].some(
    s =>
      s.dataset.filled === "true" &&
      s.dataset.locked !== "true"
  );

  const resetBtn =
    document.getElementById(
      "resetBtn"
    );

  resetBtn.disabled = !anyPlaced;
  resetBtn.style.visibility =
    "visible";
}


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffleArray(arr) {
  const a = arr.slice();

  for (
    let i = a.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [a[i], a[j]] =
      [a[j], a[i]];
  }

  return a;
}

