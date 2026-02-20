document.addEventListener("DOMContentLoaded", () => {
  const bg = document.querySelector(".landing-bg");
  if (bg) {
    const manifest = window.__MANIFEST__?.landing;

    if (manifest) {
      const isNarrow = window.innerWidth < 700;
      const isPortrait = window.innerHeight > window.innerWidth;

      let images = [];

      // בחירה לפי orientation ורוחב
      if ((isNarrow || isPortrait) && manifest.mobile?.length) {
        images = manifest.mobile;
      } else if (manifest.desktop?.length) {
        images = manifest.desktop;
      }

      if (images.length) {
        const randomImage = images[Math.floor(Math.random() * images.length)];

        // הצגת התמונה מיד (יציב יותר)
        bg.style.backgroundImage = `url(${randomImage})`;

        // preload שקט ברקע (לא חוסם)
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = randomImage;
        document.head.appendChild(link);
      }
    }
  }

  const enter = document.getElementById("enterBtn");

  if (enter) {
    enter.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        // User agent can reject fullscreen; fallback to navigation anyway.
      }

      if (window.loadPage) {
  loadPage(enter.getAttribute("href"));
} else {
  window.location.href = enter.href;
}
    });
