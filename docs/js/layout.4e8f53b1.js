async function loadSidebar() {
  const placeholder = document.querySelector('[data-sidebar]');
  if (!placeholder) return;

  try {
    const res = await fetch('/MotoSynteza/partials/sidebar.html');
    if (!res.ok) throw new Error('Sidebar load failed');
    const html = await res.text();
    placeholder.innerHTML = html;

    // MENU TOGGLE
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

  const gallery = document.querySelector('.project-gallery');
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
    { threshold: 0.6 }
  );

  images.forEach(img => revealObserver.observe(img));

  /* ===== SNAP NAVIGATION ===== */
  let current = 0;

  function scrollToSlide(index) {
    if (index < 0 || index >= images.length) return;
    images[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    current = index;
    updateIndicator();
  }

  /* Keyboard arrows */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      scrollToSlide(current + 1);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      scrollToSlide(current - 1);
    }
  });

  /* Swipe for mobile */
  let startY = 0;

  gallery?.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  });

  gallery?.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = startY - endY;

    if (Math.abs(diff) < 40) return;

    if (diff > 0) {
      scrollToSlide(current + 1);
    } else {
      scrollToSlide(current - 1);
    }
  });

  /* ===== SLIDE INDICATOR ===== */
  const indicator = document.getElementById('slideIndicator');

  function updateIndicator() {
    if (indicator) {
      indicator.textContent = (current + 1) + " / " + images.length;
    }
  }

  updateIndicator();

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
    { threshold: 0.6 }
  );

  images.forEach(img => bgObserver.observe(img));
});
