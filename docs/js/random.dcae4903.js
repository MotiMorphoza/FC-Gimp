document.addEventListener("DOMContentLoaded", () => {
  const bg = document.querySelector(".landing-bg");
  if (!bg) return;

  const manifest = window.__MANIFEST__?.landing;
  if (!manifest) return;

  const isNarrow = window.innerWidth < 700;
  const isPortrait = window.innerHeight > window.innerWidth;

  let images = [];

  // בחירה לפי orientation ורוחב
  if ((isNarrow || isPortrait) && manifest.mobile?.length) {
    images = manifest.mobile;
  } else if (manifest.desktop?.length) {
    images = manifest.desktop;
  }

  if (!images.length) return;

  const randomImage = images[Math.floor(Math.random() * images.length)];

  // הצגת התמונה מיד (יציב יותר)
  bg.style.backgroundImage = `url(${randomImage})`;

  // preload שקט ברקע (לא חוסם)
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = randomImage;
  document.head.appendChild(link);
});
