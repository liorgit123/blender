# blender
Blender Word Game

===========================
HTML (no file changes)
===========================
You do NOT modify index.html.

Tiles currently look like:
<div class="letter">א</div>

We will wrap the letter text using JS:
<div class="letter"><span class="letter-char">א</span></div>


===========================
CSS (add this anywhere in styles.css)
===========================
/* Letter shuffle animation */
.letter-char {
  display: inline-block;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.letter-char.flip-out {
  transform: rotateY(90deg);
  opacity: 0;
}

.letter-char.flip-in {
  transform: rotateY(0deg);
  opacity: 1;
}


===========================
JS — Add wrapper when creating tiles
===========================
Wherever tiles are created, replace:
tile.textContent = letter;

With:
tile.innerHTML = `<span class="letter-char">${letter}</span>`;


===========================
JS — Modify shuffle animation
===========================
Replace the part inside resetPlacement() where you currently do:
tile.textContent = letter.text;

With this animated version:

const span = tile.querySelector(".letter-char");

// Animate out
span.classList.add("flip-out");

setTimeout(() => {
  // Swap text mid-flip
  span.textContent = letter.text;

  // Animate back in
  span.classList.remove("flip-out");
  span.classList.add("flip-in");

  setTimeout(() => {
    span.classList.remove("flip-in");
  }, 250);
}, 125);


===========================
Result
===========================
• Tiles DO NOT move  
• Only the letter glyph animates  
• Shuffle becomes smooth and visually clear  
• Drag/drop and tile return behavior remain untouched  
• No layout changes, no DOM reordering  
