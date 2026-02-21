function initSlideshow() {
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport) return;

  viewport.innerHTML = "";
  viewport.dataset.initialized = "false";

  if (viewport.dataset.initialized === "true") return;

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

if (window.matchMedia("(hover: hover)").matches) {
  slideA.addEventListener("mouseenter", stop);
  slideA.addEventListener("mouseleave", start);
  slideB.addEventListener("mouseenter", stop);
  slideB.addEventListener("mouseleave", start);
}

  viewport.addEventListener("click", () => {
    change();
  });

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start();
}

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);