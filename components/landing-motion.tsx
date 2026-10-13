"use client";
import { useEffect, useRef } from "react";

export function LandingMotion() {
  const progressRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = progressRef.current?.closest<HTMLElement>(".editorial-home");
    if (!root) return;
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    root.querySelectorAll("[data-reveal], .editorial-interior .gallery-scene-inner").forEach(el => {
      el.setAttribute("data-reveal", ""); observer.observe(el);
    });
    root.classList.add("landing-motion-active");
    const tick = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${maxScroll > 0 ? window.scrollY / maxScroll : 0})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      root.classList.remove("landing-motion-active");
    };
  }, []);
  return <div ref={progressRef} className="landing-reading-progress" aria-hidden="true" />;
}
