function initSlideshow() {
  const viewport = document.querySelector("[data-slideshow]");
  if (!viewport || viewport.dataset.initialized === "true") return;

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
  let timer = null;
  let running = false;

  current.src = manifest[0];
  prefetchNext();
  start();

  function change() {
    index = (index + 1) % manifest.length;

    const newSrc = manifest[index];
    const img = new Image();

    img.onload = () => {
      next.src = newSrc;

      current.classList.remove("active");
      next.classList.add("active");

      [current, next] = [next, current];

      prefetchNext();
    };

    img.src = newSrc;
  }

  function prefetchNext() {
    const nextIndex = (index + 1) % manifest.length;
    const img = new Image();
    img.src = manifest[nextIndex];
  }

  function loop() {
    timer = setTimeout(() => {
      change();
      if (running) loop();
    }, 3333);
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  slideA.addEventListener("mouseenter", stop);
  slideA.addEventListener("mouseleave", start);

  slideB.addEventListener("mouseenter", stop);
  slideB.addEventListener("mouseleave", start);

  viewport.addEventListener("click", () => {
    stop();
    change();
  });

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start();
}

window.initSlideshow = initSlideshow;
document.addEventListener("DOMContentLoaded", initSlideshow);
