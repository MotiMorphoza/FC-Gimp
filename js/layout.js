async function loadSidebar() {
  const placeholder = document.querySelector('[data-sidebar]');
  if (!placeholder) return;

  try {
    const res = await fetch('partials/sidebar.html');
    if (!res.ok) throw new Error('Sidebar load failed');

    const html = await res.text();
    placeholder.innerHTML = html;

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
