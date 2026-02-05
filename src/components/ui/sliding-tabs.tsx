"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";

export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

interface SlidingTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Size variant - affects padding and text size */
  size?: "sm" | "md";
  /** Whether to show icons (if provided in tabs) */
  showIcons?: boolean;
  /** Optional className for the container */
  className?: string;
}

export function SlidingTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  size = "md",
  showIcons = true,
  className = "",
}: SlidingTabsProps<T>) {
  const tabRefs = React.useRef<Map<T, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Update indicator position when active tab changes
  React.useEffect(() => {
    const updateIndicator = () => {
      const activeButton = tabRefs.current.get(value);
      const container = containerRef.current;
      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
        setIsInitialized(true);
      }
    };

    updateIndicator();
    // Also update on window resize
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [value]);

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-2 text-sm gap-2",
  };

  const iconSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="relative flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = value === tab.value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.value, el);
              }}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`
                relative z-10 flex items-center rounded-lg font-medium
                transition-colors duration-200
                ${sizeClasses[size]}
                ${isActive ? "text-white" : "text-white/50 hover:text-white/80"}
              `}
            >
              {showIcons && Icon && (
                <Icon className={iconSizeClasses[size]} aria-hidden="true" />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Animated background indicator */}
        <div
          className={`
            absolute top-0 h-full rounded-lg bg-white/10
            ${isInitialized ? "transition-all duration-300 ease-out" : ""}
          `}
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: indicatorStyle.width > 0 ? 1 : 0,
          }}
        />
      </div>

      {/* Subtle glow effect */}
      <div
        className={`
          absolute -bottom-1 h-[2px] rounded-full
          bg-gradient-to-r from-transparent via-white/40 to-transparent
          ${isInitialized ? "transition-all duration-300 ease-out" : ""}
        `}
        style={{
          left: indicatorStyle.left + indicatorStyle.width * 0.15,
          width: indicatorStyle.width * 0.7,
          opacity: indicatorStyle.width > 0 ? 1 : 0,
        }}
      />
    </div>
  );
}

/** Compact icon-only variant for view mode toggles */
interface SlidingIconTabsProps<T extends string = string> {
  tabs: { value: T; icon: LucideIcon; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SlidingIconTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  className = "",
}: SlidingIconTabsProps<T>) {
  const tabRefs = React.useRef<Map<T, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const updateIndicator = () => {
      const activeButton = tabRefs.current.get(value);
      const container = containerRef.current;
      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
        setIsInitialized(true);
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="relative flex items-center gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = value === tab.value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.value, el);
              }}
              type="button"
              onClick={() => onChange(tab.value)}
              title={tab.label}
              className={`
                relative z-10 rounded-md p-1.5
                transition-colors duration-200
                ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}
              `}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{tab.label}</span>
            </button>
          );
        })}

        {/* Animated background indicator */}
        <div
          className={`
            absolute top-0 h-full rounded-md bg-white/10
            ${isInitialized ? "transition-all duration-300 ease-out" : ""}
          `}
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: indicatorStyle.width > 0 ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}
