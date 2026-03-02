"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CHANNELS = [
  {
    href: "/dashboard/play",
    label: "Play",
    angle: -90,
    radius: "clamp(132px, 20vw, 168px)",
    speed: "7.2s",
    delay: "-1.1s",
    accent: "rgba(98, 173, 255, 0.9)"
  },
  {
    href: "/dashboard/collection",
    label: "Collection",
    angle: -18,
    radius: "clamp(172px, 26vw, 208px)",
    speed: "8.8s",
    delay: "-2.6s",
    accent: "rgba(119, 224, 218, 0.9)"
  },
  {
    href: "/dashboard/social",
    label: "Social",
    angle: 54,
    radius: "clamp(212px, 31vw, 248px)",
    speed: "10.3s",
    delay: "-4.2s",
    accent: "rgba(203, 138, 255, 0.9)"
  },
  {
    href: "/dashboard/market",
    label: "Market",
    angle: 126,
    radius: "clamp(252px, 36vw, 288px)",
    speed: "11.4s",
    delay: "-3.4s",
    accent: "rgba(255, 186, 98, 0.9)"
  },
  {
    href: "/dashboard/options",
    label: "Options",
    angle: 198,
    radius: "clamp(292px, 41vw, 328px)",
    speed: "9.6s",
    delay: "-0.9s",
    accent: "rgba(255, 126, 166, 0.88)"
  }
] as const;

export function SidebarNav() {
  const router = useRouter();
  const [launchingHref, setLaunchingHref] = useState<string | null>(null);

  const launchChannel = (href: string) => {
    if (launchingHref) return;
    setLaunchingHref(href);
    window.setTimeout(() => {
      router.push(href);
    }, 280);
  };

  return (
    <nav className={`gc-system-menu${launchingHref ? " gc-menu-launching" : ""}`} aria-label="Golden Record channels">
      <div className="gc-orbit-scene">
        <div className="gc-orbit-hub">
          <span className="gc-nav-sun" aria-hidden="true">
            <span className="gc-nav-sun-letter">GR</span>
          </span>
        </div>
        <ul className="gc-orbit-links">
          {CHANNELS.map((channel) => (
            <li
              key={channel.href}
              className="gc-orbit-item"
              style={
                {
                  "--orbit-angle": `${channel.angle}deg`,
                  "--orbit-radius": channel.radius,
                  "--orbit-speed": channel.speed,
                  "--orbit-delay": channel.delay,
                  "--orbit-accent": channel.accent
                } as CSSProperties
              }
            >
              <span className="gc-orbit-track" aria-hidden="true" />
              <span className="gc-orbit-star" aria-hidden="true" />
              <Link
                href={channel.href}
                onClick={(event) => {
                  event.preventDefault();
                  launchChannel(channel.href);
                }}
                className={`gc-orbit-link${launchingHref === channel.href ? " gc-orbit-link-active" : ""}${
                  launchingHref && launchingHref !== channel.href ? " gc-orbit-link-dimmed" : ""
                }`}
              >
                {channel.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
