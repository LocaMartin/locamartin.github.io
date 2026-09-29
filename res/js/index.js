fetch("https://locamartin-auth.locamartin.workers.dev/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ page: "/" }),
}).catch(() => {});

document.addEventListener("DOMContentLoaded", () => {
  /* Scroll-reveal for sections and grid items */
  const revealTargets = document.querySelectorAll(".reveal, .reveal-item");
  if ("IntersectionObserver" in window && revealTargets.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* Active nav-link highlight while scrolling */
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");
  if ("IntersectionObserver" in window && sections.length) {
    const navIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
            });
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((sec) => navIO.observe(sec));
  }

  /* Mobile menu toggle */
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Pointer-following glow (desktop, motion-safe only) */
  const glow = document.querySelector(".cursor-glow");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (glow && !prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
    let raf = null;
    window.addEventListener("pointermove", (e) => {
      glow.style.opacity = "1";
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glow.style.transform = `translate(${e.clientX - 210}px, ${e.clientY - 210}px)`;
      });
    });
    window.addEventListener("pointerleave", () => { glow.style.opacity = "0"; });
  }

  /* Magnetic hover: nav/hero pill links nudge slightly toward the pointer */
  if (!prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
});