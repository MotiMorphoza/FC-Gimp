document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("projects-list");
  if (!listEl) return;

  const manifest = window.__MANIFEST__?.projects;

  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.warn("Projects manifest is missing or empty.");
    return;
  }

  manifest.forEach((project, index) => {
    if (!project?.slug || !project?.title) return;

    const section = document.createElement("section");
    section.className =
      "project-item " +
      (index % 2 === 0 ? "bg-1" : "bg-2") +
      (index % 2 === 1 ? " reverse" : "");

    const grid = document.createElement("div");
    grid.className = "project-grid";

    // ===== IMAGE LINK =====
    const link = document.createElement("a");
    link.href = `project-${project.slug}.html`;
    link.className = "project-link";

    const media = document.createElement("img");
    media.className = "project-media";
    media.alt = project.title;
    media.setAttribute("aria-label", project.title);
    media.loading = index === 0 ? "eager" : "lazy";

    if (Array.isArray(project.images) && project.images.length > 0) {
      media.src = project.images[0];
    } else {
      media.classList.add("placeholder");
    }

    media.onerror = () => {
      media.classList.add("placeholder");
      media.removeAttribute("src");
    };

    link.appendChild(media);

    // ===== TEXT LINK =====
    const textLink = document.createElement("a");
    textLink.href = `project-${project.slug}.html`;
    textLink.className = "project-text";

    const h2 = document.createElement("h2");
    h2.textContent = project.title;

    const p = document.createElement("p");
p.innerHTML = `
  ${project.description || ""}
  <br><br>
  <span class="enter">ENTER →</span>
`;


    textLink.appendChild(h2);
    textLink.appendChild(p);

    // ===== ZIGZAG ORDER =====
    if (index % 2 === 0) {
      grid.appendChild(link);
      grid.appendChild(textLink);
    } else {
      grid.appendChild(textLink);
      grid.appendChild(link);
    }

    section.appendChild(grid);
    listEl.appendChild(section);

    // separator
    if (index < manifest.length - 1) {
      const sep = document.createElement("div");
      sep.className = "separator";
      listEl.appendChild(sep);
    }
  });
});
