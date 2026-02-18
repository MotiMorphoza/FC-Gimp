document.addEventListener("DOMContentLoaded", () => {
  const bg = document.getElementById("landingBg");
  const landing = window.__MANIFEST__?.landing;
  if (!bg || !landing) return;

  const isPortrait = window.innerHeight > window.innerWidth;
  const pool = isPortrait ? landing.portrait : landing.landscape;

  if (!Array.isArray(pool) || pool.length === 0) return;

  const random = pool[Math.floor(Math.random() * pool.length)];

  // preload
  const img = new Image();
  img.src = random;
  img.onload = () => {
    bg.style.backgroundImage = `url(${random})`;
  };
});
