async function loadSidebar() {
  const placeholder = document.querySelector('[data-sidebar]');
  if (!placeholder) return;

  try {
    const res = await fetch('/MotoSynteza/partials/sidebar.html');
    if (!res.ok) throw new Error('Sidebar load failed');
    const html = await res.text();
    placeholder.innerHTML = html;
  } catch (err) {
    console.error('Sidebar error:', err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll(".project-gallery img");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, {
    threshold: 0.15
  });

  images.forEach(img => observer.observe(img));
});


document.addEventListener('DOMContentLoaded', loadSidebar);
