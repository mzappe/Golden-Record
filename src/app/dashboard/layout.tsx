import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const accountInitial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <main className="gc-shell">
      <div className="gc-startup-sequence" aria-hidden="true">
        <div className="gc-startup-core">
          <span className="gc-startup-logo" aria-hidden="true">
            GR
          </span>
          <p className="gc-startup-wordmark">The Golden Record</p>
        </div>
      </div>

      <header className="gc-head">
        <p className="gc-wordmark">The Golden Record</p>
        <div className="gc-account-head">
          <Link href="/dashboard/options" className="side-avatar-link" aria-label="Open account options">
            <span className="side-avatar">{accountInitial}</span>
          </Link>
          <form action={signOut}>
            <button className="btn-dark" type="submit">
              Exit
            </button>
          </form>
        </div>
      </header>

      <section className="gc-stage">{children}</section>
    </main>
  );
}
