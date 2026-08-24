function triggerFireworks() {
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
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: explode 2.6s ease-out forwards;
      opacity: 0.95;
    }
    @keyframes explode {
      0% { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F6", "#33FFF6", "#FF8C00", "#FF1493"];

  const interval = setInterval(() => {
    const spark = document.createElement("div");
    spark.classList.add("spark");
    spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    spark.style.boxShadow = `0 0 10px ${spark.style.backgroundColor}`;

    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;

    spark.style.left = x + "px";
    spark.style.top = y + "px";

    const dx = (Math.random() - 0.5) * 400;
    const dy = (Math.random() - 0.5) * 400;

    spark.style.setProperty("--dx", dx + "px");
    spark.style.setProperty("--dy", dy + "px");

    layer.appendChild(spark);

    setTimeout(() => spark.remove(), 2600);
  }, 50);
  setTimeout(() => {
    clearInterval(interval);
    layer.remove();
    style.remove();
  }, 3000);
}

