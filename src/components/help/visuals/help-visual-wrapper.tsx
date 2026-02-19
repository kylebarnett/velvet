"use client";

import { useRef, useState, useEffect, type ComponentType } from "react";

export function HelpVisualWrapper({
  Component,
  componentProps,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>;
  componentProps?: Record<string, unknown>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="my-3 overflow-hidden rounded-lg border border-border-default bg-bg-secondary"
    >
      {visible && <Component {...componentProps} />}
    </div>
  );
}
