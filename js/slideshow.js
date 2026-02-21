גרסה מפושטת, בלי state מיותר, אותה התנהגות:

```js
function initSlideshow() {
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport) return;

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

  const DURATION = 3333;
  const supportsHover = window.matchMedia("(hover: hover)").matches;

  let hasLeftOnce = false;
  let pointerInside = false;

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
    if (!interval) {
      interval = setInterval(change, DURATION);
    }
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  if (supportsHover) {
    viewport.addEventListener("mouseenter", () => {
      pointerInside = true;
      if (hasLeftOnce) stop();
    });

    viewport.addEventListener("mouseleave", () => {
      pointerInside = false;
      hasLeftOnce = true;
      start();
    });
  }

  viewport.addEventListener("click", change);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      if (!(supportsHover && hasLeftOnce && pointerInside)) {
        start();
      }
    }
  });

  start();
}

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);
```
