// animations.js – ספרית אנימציות חוזרות

/**
 * Scale In (Grow/Fade In) - Simple
 * @param {HTMLElement} element 
 * @param {number} duration 
 * @returns {Animation}
 */
function animateScaleInSimple(element, duration = 300) {
  return element.animate(
    [
      { transform: 'scale(0.5)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    {
      duration: duration,
      easing: 'ease-out',
      fill: 'forwards'
    }
  );
}

/**
 * Scale In (Grow/Fade In) - With Overshoot
 * @param {HTMLElement} element 
 * @param {number} duration 
 * @returns {Animation}
 */
function animateScaleIn(element, duration = 300) {
  return element.animate(
    [
      { transform: 'scale(0.5)', opacity: 0, offset: 0 },
      { transform: 'scale(1.3)', opacity: 1, offset: 0.7 }, // Overshoot at 70% of duration
      { transform: 'scale(1)', opacity: 1, offset: 1 }      // Settle at 100%
    ],
    {
      duration: duration,
      easing: 'ease-out',
      fill: 'forwards'
    }
  );
}

/**
 * Scale Out (Shrink/Fade Out)
 * @param {HTMLElement} element
 * @param {number} duration
 * @returns {Animation}
 */
function animateScaleOut(element, duration = 300) {
  return element.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.5)', opacity: 0 }
    ],
    {
      duration: duration,
      easing: 'ease-in',
      fill: 'forwards'
    }
  );
}

/**
 * Glow-n-Bounce Animation for Success Tiles
 * @param {HTMLElement} tile
 */
function animateSuccessTile(tile) {
  if (!tile) return;
  tile.animate(
    [
      {
        transform: "scale(1)",
        boxShadow: "0 0 0 rgba(40,120,255,0)"
      },
      {
        transform: "scale(1.1)",
        boxShadow: `
          0 0 10px rgba(80,160,255,1),
          0 0 28px rgba(30,110,255,.9),
          0 0 45px rgba(0,70,255,.6)
        `
      },
      {
        transform: "scale(1)",
        boxShadow: `
          0 0 7px rgba(80,160,255,.8),
          0 0 18px rgba(30,110,255,.6)
        `
      }
    ],
    {
      duration: 400,
      easing: "ease-out",
      fill: "forwards"
    }
  );
}

