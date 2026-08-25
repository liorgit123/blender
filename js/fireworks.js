function triggerFireworks() {
  const factBox = document.getElementById("clue");
  if (!factBox) return;

  const rect = factBox.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.id = "fireworks-layer";
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9999";
  document.body.appendChild(layer);

  const style = document.createElement("style");
  style.textContent = `
    .spark {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      opacity: 0;
      animation: pop 0.8s ease-out forwards;
    }
    @keyframes pop {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F6", "#33FFF6"];

  // Center coordinates for the explosion
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Create 6 sparks, popping one after another
  for (let i = 0; i < 6; i++) {
  setTimeout(() => {
      const spark = document.createElement("div");
      spark.classList.add("spark");
      spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      spark.style.boxShadow = `0 0 12px ${spark.style.backgroundColor}`;

      // Position further apart (range of 80px)
      spark.style.left = centerX + (Math.random() - 0.5) * 80 + "px";
      spark.style.top = centerY + (Math.random() - 0.5) * 80 + "px";

      layer.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }, i * 400); // Delay each pop slightly more
}

  setTimeout(() => {
    layer.remove();
    style.remove();
  }, 3000);
}

