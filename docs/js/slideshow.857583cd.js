function initSlideshow() {
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport) return;

  viewport.innerHTML = "";
  viewport.dataset.initialized = "false";

if (viewport.dataset.initialized === "true") return;
viewport.dataset.initialized = "true";
viewport.innerHTML = "";

  const manifest = window.__MANIFEST__?.main || [];
  if (!manifest.length) return;

  viewport.dataset.initialized = "true";

  const slideA = document.createElement("img");
  const slideB = document.createElement("img");

  slideA.className = "slide active";
  slideB.className = "slide";

  viewport.appendChild(slideA);
  viewport.appendChild(slideB);

  let current = slideA;
  let next = slideB;
  let index = 0;
  let interval = null;
  const DURATION = 2222; // שליטה בזמן תצוגה

  current.src = manifest[0];
  preload(1);

  function change() {
    index = (index + 1) % manifest.length;
    const newSrc = manifest[index];

    next.src = newSrc;

    current.classList.remove("active");
    next.classList.add("active");

    [current, next] = [next, current];

    preload(index + 1);
  }

  function preload(i) {
    const img = new Image();
    img.src = manifest[i % manifest.length];
  }

  function start() {
    if (interval) return;
    interval = setInterval(change, DURATION);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

להלן הקובץ המלא מתוקן:

```js
function initSlideshow() {
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport) return;

  // Guard – מונע אתחול כפול
  if (viewport.dataset.initialized === "true") return;
  viewport.dataset.initialized = "true";

  viewport.innerHTML = "";

  const manifest = window.__MANIFEST__?.main || [];
  if (!manifest.length) return;

  const slideA = document.createElement("img");
  const slideB = document.createElement("img");

  slideA.className = "slide active";
  slideB.className = "slide";

  viewport.appendChild(slideA);
  viewport.appendChild(slideB);

  let current = slideA;
  let next = slideB;
  let index = 0;
  let interval = null;
  const DURATION = 2222;

  current.src = manifest[0];
  preload(1);

  function change() {
    index = (index + 1) % manifest.length;
    next.src = manifest[index];

    current.classList.remove("active");
    next.classList.add("active");

    [current, next] = [next, current];

    preload(index + 1);
  }

  function preload(i) {
    const img = new Image();
    img.src = manifest[i % manifest.length];
  }

  function start() {
    if (interval) return;
    interval = setInterval(change, DURATION);
  }

  function stop() {
    if (!interval) return;
    clearInterval(interval);
    interval = null;
  }

  // Hover לוגיקה – מתחיל תמיד, נעצר רק מה-hover השני
  if (window.matchMedia("(hover: hover)").matches) {

    let hoverCount = 0;
    let hasLeftOnce = false;

    viewport.addEventListener("mouseenter", () => {
      if (hoverCount === 0) {
        hoverCount++;
        return; // hover ראשון – מתעלמים
      }

      if (hasLeftOnce) {
        stop();
      }
    });

    viewport.addEventListener("mouseleave", () => {
      hasLeftOnce = true;
      start();
    });
  }

  viewport.addEventListener("click", change);

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start(); // התחלה אוטומטית תמיד
}

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);
```

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);