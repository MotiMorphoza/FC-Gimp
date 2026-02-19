/* =========================
   SIDEBAR LOADER
========================= */

async function loadSidebar() {
  const placeholder = document.querySelector("[data-sidebar]");
  if (!placeholder) return;

  try {
    const res = await fetch("/MotoSynteza/partials/sidebar.html");
    if (!res.ok) throw new Error("Sidebar load failed");

    const html = await res.text();
    placeholder.innerHTML = html;

    const toggle = placeholder.querySelector(".menu-toggle");
    const menu = placeholder.querySelector(".menu");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
      });
    }

  } catch (err) {
    console.error("Sidebar error:", err);
  }
}

/* =========================
   PROJECT LOADER (JSON)
========================= */
async function loadProject() {

  const gallery = document.querySelector('.project-gallery');
  if (!gallery) return;

  const projectSlug = document.body.dataset.project;
  if (!projectSlug) return;

  try {
    const res = await fetch(`projects/${projectSlug}/project.json`);
    if (!res.ok) throw new Error("Project JSON not found");

    const data = await res.json();

    data.images.forEach(imgData => {

      const figure = document.createElement("figure");
      figure.className = "project-figure";

      const caption = document.createElement("div");
      caption.className = "project-caption";
      caption.textContent = imgData.caption || "";

      const img = document.createElement("img");
      img.src = `projects/${projectSlug}/${imgData.src}`;
      img.loading = "lazy";

      figure.appendChild(caption);
      figure.appendChild(img);
      gallery.appendChild(figure);
    });

  } catch (err) {
    console.error(err);
  }
}


/* =========================
   MAIN INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {

  await loadSidebar();
  await loadProject();

  const images = document.querySelectorAll(".project-gallery img");
  if (!images.length) return;

  /* ===== ENTRANCE ANIMATION ===== */

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle("visible", entry.isIntersecting);
      });
    },
    { threshold: 0.6 }
  );

  images.forEach(img => revealObserver.observe(img));

  /* ===== SLIDE INDICATOR ===== */

  const indicator = document.getElementById("slideIndicator");

  if (indicator) {
    const indexObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = [...images].indexOf(entry.target) + 1;
            indicator.textContent = `${index} / ${images.length}`;
          }
        });
      },
      { threshold: 0.6 }
    );

    images.forEach(img => indexObserver.observe(img));
  }

  /* ===== DYNAMIC BACKGROUND ===== */

  const bg1 = document.getElementById("bg1");
  const bg2 = document.getElementById("bg2");

  if (bg1 && bg2) {
    let active = bg1;
    let inactive = bg2;

    function setBackground(src) {
      inactive.style.backgroundImage = `url(${src})`;
      inactive.classList.add("active");
      active.classList.remove("active");

      [active, inactive] = [inactive, active];
    }

    const bgObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setBackground(entry.target.src);
          }
        });
      },
      { threshold: 0.35 }
    );

    images.forEach(img => bgObserver.observe(img));
  }

  /* ===== LIGHTBOX ===== */

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  const closeBtn = lightbox?.querySelector(".lightbox-close");

  if (lightbox && lightboxImg) {

    images.forEach(img => {
      img.addEventListener("click", () => {
        lightboxImg.src = img.src;
        lightbox.classList.add("active");
      });
    });

    lightbox.addEventListener("click", () => {
      lightbox.classList.remove("active");
    });

    closeBtn?.addEventListener("click", e => {
      e.stopPropagation();
      lightbox.classList.remove("active");
    });
  }

});
