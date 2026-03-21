function initSlideshow() {
  const active = window.__MOTO_SLIDESHOW_ACTIVE__;
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport) {
    if (active && typeof active.dispose === "function") {
      active.dispose();
      window.__MOTO_SLIDESHOW_ACTIVE__ = null;
    }
    return;
  }

  if (active && active.viewport === viewport) return;
  if (active && typeof active.dispose === "function") {
    active.dispose();
    window.__MOTO_SLIDESHOW_ACTIVE__ = null;
  }

  viewport.innerHTML = "";

  const manifest = window.__MANIFEST__?.main || [];
  if (!manifest.length) return;

  const slideA = document.createElement("img");
  const slideB = document.createElement("img");

  slideA.className = "slide active";
  slideB.className = "slide";
  slideA.alt = "MotoSynteza featured image";
  slideB.alt = "MotoSynteza featured image";
  slideA.loading = "eager";
  slideA.setAttribute("fetchpriority", "high");
  slideA.decoding = "async";
  slideB.loading = "lazy";
  slideB.decoding = "async";

  viewport.appendChild(slideA);
  viewport.appendChild(slideB);

  let current = slideA;
  let next = slideB;
  let index = 0;
  let interval = null;
  let disposed = false;
  const DURATION = 3333;

  current.src = manifest[0];
  preload(1);

  function change() {
    if (disposed) return;
    index = (index + 1) % manifest.length;
    const newSrc = manifest[index];

    next.src = newSrc;

    current.classList.remove("active");
    next.classList.add("active");

    [current, next] = [next, current];

    preload(index + 1);
  }

  function preload(i) {
    if (disposed) return;
    const img = new Image();
    img.decoding = "async";
    img.src = manifest[i % manifest.length];
  }

  function start() {
    if (disposed || interval) return;
    interval = setInterval(change, DURATION);
  }

  function stop() {
    if (!interval) return;
    clearInterval(interval);
    interval = null;
  }

  function handleViewportClick() {
    if (disposed) return;
    change();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    viewport.removeEventListener("click", handleViewportClick);
  }

  viewport.addEventListener("click", handleViewportClick);

  start();
  window.__MOTO_SLIDESHOW_ACTIVE__ = { viewport, dispose };
}

window.destroySlideshow = function destroySlideshow() {
  const active = window.__MOTO_SLIDESHOW_ACTIVE__;
  if (active && typeof active.dispose === "function") {
    active.dispose();
  }
  window.__MOTO_SLIDESHOW_ACTIVE__ = null;
};
window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);
