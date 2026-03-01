import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Item = {
  id: string;
  card_name: string;
  set_name: string;
  notes: string | null;
};

function formatType(raw: string | null) {
  if (raw === "card") return "Card";
  if (raw === "magazine") return "Magazine";
  return "Game";
}

export default async function PlayPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("watch_targets")
    .select("id, card_name, set_name, notes")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(9);

  const items = (data ?? []) as Item[];

  return (
    <section className="channel-view">
      <header className="channel-view-head">
        <Link href="/dashboard" className="channel-back">
          Menu
        </Link>
        <h1>Play</h1>
      </header>

      <section className="channel-stack">
        <article className="panel">
          <p className="panel-title">Launch Queue</p>
          {items.length === 0 ? (
            <p className="empty-state">No items available yet.</p>
          ) : (
            <div className="list-grid">
              {items.map((item) => (
                <article className="list-card" key={item.id}>
                  <p className="list-meta">{formatType(item.notes)}</p>
                  <p className="list-title">{item.card_name}</p>
                  <p className="muted-small">{item.set_name}</p>
                  <button className="btn-primary" type="button" disabled>
                    Open Soon
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
