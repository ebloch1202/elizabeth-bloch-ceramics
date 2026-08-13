// =========================================================
// CERAMIC STUDIO — SITE SCRIPT
// Mobile nav, header scroll, scroll-reveal, and the inline
// piece-detail panel (click a piece -> expand detail in place,
// gallery continues below).
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  // ---- Mobile nav toggle ----
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen);
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    links.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  // ---- Header becomes solid after scrolling past the hero ----
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-solid", window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Fade-in reveal for elements marked .reveal ----
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // =========================================================
  // IMAGE LIGHTBOX
  // ---------------------------------------------------------
  // Clicking a .piece thumbnail opens its photo full-size in a
  // modal overlay above the page. Closed via the close button,
  // clicking the backdrop, or pressing Escape. The photo itself
  // can be clicked (or tapped) to zoom in, following the cursor
  // (or finger) to pan around the zoomed image; clicking again
  // zooms back out.
  // =========================================================

  const LIGHTBOX_ZOOM_SCALE = 2.5;

  let activeLightbox = null;
  let activePiece = null;
  let lastFocused = null;

  document.querySelectorAll(".piece[data-title]").forEach((piece) => {
    piece.addEventListener("click", (e) => {
      e.preventDefault();
      openLightbox(piece);
    });
  });

  function openLightbox(piece) {
    const pieceImg = piece.querySelector("img");
    if (!pieceImg) return;

    lastFocused = document.activeElement;

    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", piece.dataset.title || "Image preview");

    const backdrop = document.createElement("div");
    backdrop.className = "lightbox-backdrop";

    const closeBtn = document.createElement("button");
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";

    const content = document.createElement("div");
    content.className = "lightbox-content";

    const imgWrap = document.createElement("div");
    imgWrap.className = "lightbox-image-wrap";

    const img = document.createElement("img");
    img.className = "lightbox-image";
    img.src = pieceImg.src;
    img.alt = pieceImg.alt || piece.dataset.title || "";

    imgWrap.appendChild(img);
    content.appendChild(imgWrap);
    setupLightboxZoom(lightbox, imgWrap, img);

    if (piece.dataset.title || piece.dataset.medium) {
      const caption = document.createElement("div");
      caption.className = "lightbox-caption";

      if (piece.dataset.title) {
        const title = document.createElement("p");
        title.className = "lightbox-title";
        title.textContent = piece.dataset.title;
        caption.appendChild(title);
      }
      if (piece.dataset.medium) {
        const meta = document.createElement("p");
        meta.className = "lightbox-meta";
        meta.textContent = piece.dataset.medium;
        caption.appendChild(meta);
      }

      content.appendChild(caption);
    }

    lightbox.appendChild(backdrop);
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(content);
    document.body.appendChild(lightbox);
    document.body.classList.add("lightbox-open");

    piece.classList.add("is-active");
    activePiece = piece;
    activeLightbox = lightbox;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lightbox.classList.add("is-open");
      });
    });

    backdrop.addEventListener("click", closeLightbox);
    closeBtn.addEventListener("click", closeLightbox);
    closeBtn.focus();
  }

  function setupLightboxZoom(lightbox, imgWrap, img) {
    let zoomed = false;

    function originFromPoint(clientX, clientY) {
      const rect = imgWrap.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    }

    function zoomIn(clientX, clientY) {
      const { x, y } = originFromPoint(clientX, clientY);
      img.style.transformOrigin = x + "% " + y + "%";
      img.style.transform = "scale(" + LIGHTBOX_ZOOM_SCALE + ")";
      img.classList.add("is-zoomed");
      lightbox.classList.add("is-zoomed");
      zoomed = true;
    }

    function zoomOut() {
      img.style.transform = "";
      img.style.transformOrigin = "center center";
      img.classList.remove("is-zoomed");
      lightbox.classList.remove("is-zoomed");
      zoomed = false;
    }

    img.addEventListener("click", (e) => {
      e.stopPropagation();
      if (zoomed) {
        zoomOut();
      } else {
        zoomIn(e.clientX, e.clientY);
      }
    });

    img.addEventListener("mousemove", (e) => {
      if (!zoomed) return;
      const { x, y } = originFromPoint(e.clientX, e.clientY);
      img.style.transformOrigin = x + "% " + y + "%";
    });

    img.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        if (zoomed) {
          zoomOut();
        } else {
          zoomIn(t.clientX, t.clientY);
        }
      },
      { passive: true }
    );

    img.addEventListener(
      "touchmove",
      (e) => {
        if (!zoomed || e.touches.length !== 1) return;
        const t = e.touches[0];
        const { x, y } = originFromPoint(t.clientX, t.clientY);
        img.style.transformOrigin = x + "% " + y + "%";
      },
      { passive: true }
    );
  }

  function closeLightbox() {
    if (!activeLightbox) return;

    activeLightbox.classList.remove("is-open");
    if (activePiece) activePiece.classList.remove("is-active");
    document.body.classList.remove("lightbox-open");

    const lightboxRef = activeLightbox;
    setTimeout(() => {
      lightboxRef.remove();
    }, 300);

    if (lastFocused) lastFocused.focus();

    activeLightbox = null;
    activePiece = null;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
});
