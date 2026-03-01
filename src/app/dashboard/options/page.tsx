import Link from "next/link";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function OptionsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { count } = await supabase.from("watch_targets").select("id", { count: "exact", head: true }).eq("user_id", user?.id ?? "");

  return (
    <section className="channel-view">
      <header className="channel-view-head">
        <Link href="/dashboard" className="channel-back">
          Menu
        </Link>
        <h1>Options</h1>
      </header>

      <section className="channel-stack">
        <article className="panel">
          <dl className="meta-list">
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? "Not available"}</dd>
            </div>
            <div>
              <dt>Saved items</dt>
              <dd>{count ?? 0}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>Golden Record MVP</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <form action={signOut}>
            <button className="btn-dark" type="submit">
              Sign out
            </button>
          </form>
        </article>
      </section>
    </section>
  );
}
