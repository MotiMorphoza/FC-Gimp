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
<<<<<<< ours
=======
  const preloadedSlides = new Set();

  const supportsHover = window.matchMedia("(hover: hover)").matches;
  let hasEnteredViewport = false;
  let hasLeftViewportOnce = false;
  let isPointerInsideViewport = false;
>>>>>>> theirs

  current.src = manifest[0];
  preloadedSlides.add(manifest[0]);
  preloadNextTwo(0);

  function change() {
    index = (index + 1) % manifest.length;
    const newSrc = manifest[index];

    next.src = newSrc;

    current.classList.remove("active");
    next.classList.add("active");

    [current, next] = [next, current];

    preloadNextTwo(index);
  }

  function preloadByIndex(i) {
    const src = manifest[i % manifest.length];
    if (!src || preloadedSlides.has(src)) return;

    const img = new Image();
    img.src = src;
    preloadedSlides.add(src);
  }

  function preloadNextTwo(fromIndex) {
    preloadByIndex(fromIndex + 1);
    preloadByIndex(fromIndex + 2);
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

<<<<<<< ours
=======
  if (supportsHover) {
    viewport.addEventListener("mouseenter", () => {
      isPointerInsideViewport = true;
      hasEnteredViewport = true;

      if (!hasLeftViewportOnce) {
        return;
      }

      stop();
    });

    viewport.addEventListener("mouseleave", () => {
      isPointerInsideViewport = false;

      if (!hasEnteredViewport) {
        return;
      }

      hasLeftViewportOnce = true;
      start();
    });
  }

>>>>>>> theirs
  viewport.addEventListener("click", () => {
    change();
  });

<<<<<<< ours
=======
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      return;
    }

    if (supportsHover && hasLeftViewportOnce && isPointerInsideViewport) {
      return;
    }

    start();
  });

>>>>>>> theirs
  start();
}

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);
