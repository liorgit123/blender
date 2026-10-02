function triggerFireworks(intensity = "high") {
  const patternBox = document.getElementById("pattern");
  const scrambleBox = document.getElementById("scramble");

  let minX = 0;
  let maxX = window.innerWidth;
  let minY = 0;
  let maxY = window.innerHeight;

  if (patternBox) {
    const rectPattern = patternBox.getBoundingClientRect();
    const rectScramble = scrambleBox ? scrambleBox.getBoundingClientRect() : rectPattern;
    minX = Math.min(rectPattern.left, rectScramble.left);
    maxX = Math.max(rectPattern.right, rectScramble.right);
    minY = Math.min(rectPattern.top, rectScramble.top);
    maxY = Math.max(rectPattern.bottom, rectScramble.bottom);
  }

  const horizontalTrim = (maxX - minX) * 0.2;
  minX += horizontalTrim;
  maxX -= horizontalTrim;
  const width = maxX - minX;
  const verticalTrim = (maxY - minY) * 0.2;
  minY += verticalTrim;
  maxY -= verticalTrim;
  const height = maxY - minY;

  const layer = document.createElement("div");
  layer.id = "fireworks-layer";
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9999";
  document.body.appendChild(layer);

  const style = document.createElement("style");
  style.textContent = `
    .firework-particle {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      opacity: 0;
    }
  `;
  document.head.appendChild(style);

  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F6", "#33FFF6"];

  function explodeAt(x, y) {
  const particleCount = intensity === "high" ? 45 : 15; // More particles
  const maxDistance = intensity === "high" ? 120 : 60;  // Bigger area

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * (maxDistance - 40);
    const particle = document.createElement("div");
    particle.classList.add("firework-particle");

    // If low intensity, force red. Otherwise use random colors
    particle.style.backgroundColor = intensity === "high"
        ? colors[Math.floor(Math.random() * colors.length)]
        : "#FF0000";

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 }
    ], {
        duration: 3000 + Math.random() * 500, // Slower animation
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
      fill: 'forwards'
    });

    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 2000);
  }
}

  // Trigger explosions at intervals
  const bursts = intensity === "high" ? 6 : 3;
  for (let j = 0; j < bursts; j++) {
    setTimeout(() => {
      const randomX = minX + Math.random() * width;
      const randomY = minY + Math.random() * height;
      explodeAt(randomX, randomY);
    }, j * 500); // Trigger next explosion every 1000ms
  }

  setTimeout(() => {
    layer.remove();
    style.remove();
  }, 10000);
}

