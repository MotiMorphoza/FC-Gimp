async function loadSidebar() {
  const placeholder = document.querySelector('[data-sidebar]');
  if (!placeholder) return;

  try {
    const res = await fetch('/MotoSynteza/partials/sidebar.html');
    if (!res.ok) throw new Error('Sidebar load failed');
    const html = await res.text();
    placeholder.innerHTML = html;

    // ===== MENU TOGGLE =====
    const toggle = placeholder.querySelector('.menu-toggle');
    const menu = placeholder.querySelector('.menu');

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
      });
    }

  } catch (err) {
    console.error('Sidebar error:', err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  const images = document.querySelectorAll(".project-gallery img");
  if (!images.length) return;

  /* ===== IMAGE ENTRANCE ANIMATION (LOOPING) ===== */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        } else {
          entry.target.classList.remove("visible");
        }
      });
    },
    {
      threshold: 0.6
    }
  );

  images.forEach(img => revealObserver.observe(img));

  /* ===== DYNAMIC BACKGROUND FADE (אם קיים) ===== */
  const bg1 = document.getElementById('bg1');
  const bg2 = document.getElementById('bg2');
  if (!bg1 || !bg2) return;

  let active = bg1;
  let inactive = bg2;

  function setBackground(src) {
    inactive.style.backgroundImage = `url(${src})`;
    inactive.classList.add('active');
    active.classList.remove('active');

    const temp = active;
    active = inactive;
    inactive = temp;
  }

  const bgObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setBackground(entry.target.src);
        }
      });
    },
    {
      threshold: 0.6
    }
  );

  images.forEach(img => bgObserver.observe(img));
});
