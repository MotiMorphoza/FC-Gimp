קובץ `random.js` מתוקן ומלא, עם:

* בחירה לפי mobile / desktop
* preload לפני הצגת התמונה
* בדיקת orientation בנוסף לרוחב
* קוד נקי וללא מצבים ריקים

```js
document.addEventListener("DOMContentLoaded", () => {
  const bg = document.querySelector(".landing-bg");
  if (!bg) return;

  const manifest = window.__MANIFEST__?.landing;
  if (!manifest) return;

  const isNarrow = window.innerWidth < 700;
  const isPortrait = window.innerHeight > window.innerWidth;

  let images = [];

  // בחירה לפי orientation ורוחב
  if ((isNarrow || isPortrait) && Array.isArray(manifest.mobile) && manifest.mobile.length) {
    images = manifest.mobile;
  } else if (Array.isArray(manifest.desktop) && manifest.desktop.length) {
    images = manifest.desktop;
  }

  if (!images.length) return;

  const randomImage = images[Math.floor(Math.random() * images.length)];

  // preload לפני הצגה
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = randomImage;
  document.head.appendChild(link);

  // הצגת התמונה
  const img = new Image();
  img.src = randomImage;
  img.onload = () => {
    bg.style.backgroundImage = `url(${randomImage})`;
  };
});
```
