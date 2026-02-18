document.addEventListener("DOMContentLoaded", () => {
  const bg = document.querySelector(".landing-bg");
  if (!bg) return;

  const manifest = window.__MANIFEST__?.landing;
  if (!manifest) return;

  const isMobile = window.innerWidth < 700;

  let images = [];

  if (isMobile && Array.isArray(manifest.mobile) && manifest.mobile.length) {
    images = manifest.mobile;
  } else if (Array.isArray(manifest.desktop) && manifest.desktop.length) {
    images = manifest.desktop;
  }

  if (!images.length) return;

  const randomImage = images[Math.floor(Math.random() * images.length)];

  bg.style.backgroundImage = `url(${randomImage})`;

  /* preload image */
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = randomImage;
  document.head.appendChild(link);
});
