import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

const AUTH_ORBITS = [
  {
    radius: "clamp(132px, 20vw, 168px)",
    speed: "7.2s",
    delay: "-1.1s",
    accent: "rgba(98, 173, 255, 0.9)"
  },
  {
    radius: "clamp(172px, 26vw, 208px)",
    speed: "8.8s",
    delay: "-2.6s",
    accent: "rgba(119, 224, 218, 0.9)"
  },
  {
    radius: "clamp(212px, 31vw, 248px)",
    speed: "10.3s",
    delay: "-4.2s",
    accent: "rgba(203, 138, 255, 0.9)"
  },
  {
    radius: "clamp(252px, 36vw, 288px)",
    speed: "11.4s",
    delay: "-3.4s",
    accent: "rgba(255, 186, 98, 0.9)"
  },
  {
    radius: "clamp(292px, 41vw, 328px)",
    speed: "9.6s",
    delay: "-0.9s",
    accent: "rgba(255, 126, 166, 0.88)"
  }
] as const;

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-stage">
        <div className="auth-brand" aria-hidden="true">
          <div className="auth-mini-orbit">
            <div className="gc-orbit-scene">
              <div className="gc-orbit-hub">
                <span className="gc-nav-sun">
                  <span className="gc-nav-sun-letter">GR</span>
                </span>
              </div>
              <ul className="gc-orbit-links">
                {AUTH_ORBITS.map((orbit) => (
                  <li
                    key={`${orbit.radius}-${orbit.speed}`}
                    className="gc-orbit-item"
                    style={
                      {
                        "--orbit-radius": orbit.radius,
                        "--orbit-speed": orbit.speed,
                        "--orbit-delay": orbit.delay,
                        "--orbit-accent": orbit.accent
                      } as CSSProperties
                    }
                  >
                    <span className="gc-orbit-track" />
                    <span className="gc-orbit-star" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <h1>The Golden Record</h1>
          <p>Track and share game, card, and magazine collections in one place.</p>
        </div>

        <section className="auth-card">
          <AuthForm />
        </section>
      </section>
    </main>
  );
}
