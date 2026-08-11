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
  // INLINE PIECE-DETAIL PANEL
  // ---------------------------------------------------------
  // Clicking a .piece with a [data-title] opens a detail panel
  // right below that item in the grid (spanning the full grid
  // width). The panel shows the photo large on the left and
  // descriptive text sliding in from the right. The rest of
  // the gallery continues beneath it. Clicking the close
  // button, pressing Escape, or clicking another piece
  // collapses it.
  // =========================================================

  let activePanel = null;
  let activePiece = null;

  document.querySelectorAll(".piece[data-title]").forEach((piece) => {
    piece.addEventListener("click", (e) => {
      e.preventDefault();
      handlePieceClick(piece);
    });
  });

  function handlePieceClick(piece) {
    // If this piece is already open, close it
    if (activePiece === piece) {
      closePanel();
      return;
    }

    // Close any existing panel first (instant swap, no double-animation)
    if (activePanel) {
      activePanel.remove();
      if (activePiece) activePiece.classList.remove("is-active");
      activePanel = null;
      activePiece = null;
    }

    const panel = document.createElement("div");
    panel.className = "detail-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", piece.dataset.title + " details");

    // --- image side ---
    const imgWrap = document.createElement("div");
    imgWrap.className = "detail-image";

    const pieceImg = piece.querySelector("img");
    if (pieceImg) {
      const bigImg = document.createElement("img");
      bigImg.src = pieceImg.src;
      bigImg.alt = pieceImg.alt || piece.dataset.title;
      imgWrap.appendChild(bigImg);
    } else {
      const ph = document.createElement("div");
      ph.className = "detail-placeholder";
      ph.innerHTML = "<span>" + piece.dataset.title + "</span>";
      imgWrap.appendChild(ph);
    }

    // --- text side (slides in) ---
    const info = document.createElement("div");
    info.className = "detail-info";

    let infoHTML = '<button class="detail-close" aria-label="Close detail view">&times;</button>';
    infoHTML += '<h2 class="detail-title">' + piece.dataset.title + '</h2>';

    if (piece.dataset.medium) {
      infoHTML += '<p class="detail-meta">' + piece.dataset.medium + '</p>';
    }
    if (piece.dataset.dimensions) {
      infoHTML += '<p class="detail-meta">' + piece.dataset.dimensions + '</p>';
    }
    if (piece.dataset.description) {
      infoHTML += '<p class="detail-desc">' + piece.dataset.description + '</p>';
    }

    infoHTML += '<p class="detail-inquire"><a href="contact.html">Inquire about this piece &rarr;</a></p>';

    info.innerHTML = infoHTML;

    panel.appendChild(imgWrap);
    panel.appendChild(info);

    // Insert right after the clicked piece so it spans the grid
    // and pushes the rest of the gallery down, like Daniel Bloch
    // Ceramics' product detail view.
    piece.after(panel);

    piece.classList.add("is-active");
    activePiece = piece;
    activePanel = panel;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add("is-open");
      });
    });

    panel.querySelector(".detail-close").addEventListener("click", closePanel);

    setTimeout(() => {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function closePanel() {
    if (!activePanel) return;

    activePanel.classList.remove("is-open");
    if (activePiece) activePiece.classList.remove("is-active");

    const panelRef = activePanel;
    setTimeout(() => {
      panelRef.remove();
    }, 400);

    activePanel = null;
    activePiece = null;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
});
