const showOnLoad = () => {
  const loadTargets = document.querySelectorAll(".reveal-on-load");
  requestAnimationFrame(() => {
    loadTargets.forEach((element) => {
      element.classList.add("is-visible");
    });
  });
};

const setupScrollReveal = () => {
  const scrollTargets = document.querySelectorAll(".reveal-on-scroll");
  if (scrollTargets.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    scrollTargets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
  );

  scrollTargets.forEach((element) => observer.observe(element));
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    showOnLoad();
    setupScrollReveal();
  });
} else {
  showOnLoad();
  setupScrollReveal();
}
