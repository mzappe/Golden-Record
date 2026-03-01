import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { CollectraOrbitLogo } from "@/components/collectra-orbit-logo";
import { createClient } from "@/lib/supabase/server";

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
          <CollectraOrbitLogo className="auth-orbit-logo" ariaHidden />
          <h1>Collectra</h1>
          <p>Track and share game, card, and magazine collections in one place.</p>
        </div>

        <section className="auth-card">
          <AuthForm />
        </section>
      </section>
    </main>
  );
}
