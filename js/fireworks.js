function triggerFireworks() {
  const patternBox = document.getElementById("pattern");
  if (!patternBox) return;

  const rect = patternBox.getBoundingClientRect();
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
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 40;
    const particle = document.createElement("div");
    particle.classList.add("firework-particle");
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
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

  // Trigger 4 explosions at intervals
  for (let j = 0; j < 4; j++) {
    setTimeout(() => {
      const randomX = rect.left + (rect.width * 0.2) + Math.random() * (rect.width * 0.6);
      const randomY = rect.top + (rect.height * 0.2) + Math.random() * (rect.height * 0.6);
      explodeAt(randomX, randomY);
    }, j * 500); // Trigger next explosion every 1000ms
  }

  setTimeout(() => {
    layer.remove();
    style.remove();
  }, 5000);
}

