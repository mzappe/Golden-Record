import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Item = {
  id: string;
  card_name: string;
  max_price_cents: number;
  notes: string | null;
};

type ItemType = "game" | "card" | "magazine";

function normalizeType(raw: string | null): ItemType {
  if (raw === "game" || raw === "card" || raw === "magazine") {
    return raw;
  }
  return "game";
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default async function MarketPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("watch_targets")
    .select("id, card_name, max_price_cents, notes")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(60);

  const items = (data ?? []) as Item[];
  const total = items.reduce((sum, item) => sum + item.max_price_cents, 0);
  const average = items.length ? Math.round(total / items.length) : 0;
  const top = items.length ? Math.max(...items.map((item) => item.max_price_cents)) : 0;

  const distribution = {
    game: 0,
    card: 0,
    magazine: 0
  } as Record<ItemType, number>;

  for (const item of items) {
    distribution[normalizeType(item.notes)] += 1;
  }

  return (
    <section className="channel-view">
      <header className="channel-view-head">
        <Link href="/dashboard" className="channel-back">
          Menu
        </Link>
        <h1>Market</h1>
      </header>

      <section className="channel-stack">
        <section className="stats-grid">
          <article className="panel stat-card">
            <p className="stat-title">Tracked</p>
            <p className="stat-value">{items.length}</p>
          </article>
          <article className="panel stat-card">
            <p className="stat-title">Average Target</p>
            <p className="stat-value">{formatPrice(average)}</p>
          </article>
          <article className="panel stat-card">
            <p className="stat-title">Top Target</p>
            <p className="stat-value">{formatPrice(top)}</p>
          </article>
        </section>

        <article className="panel">
          <p className="panel-title">Category Split</p>
          <div className="type-strip" role="list" aria-label="Market category split">
            <p className="type-pill" role="listitem">
              Games {distribution.game}
            </p>
            <p className="type-pill" role="listitem">
              Cards {distribution.card}
            </p>
            <p className="type-pill" role="listitem">
              Magazines {distribution.magazine}
            </p>
          </div>
        </article>

        <article className="panel">
          <p className="panel-title">Highest Targets</p>
          {items.length === 0 ? (
            <p className="empty-state">No data yet. Add collection items first.</p>
          ) : (
            <div className="table-wrap">
              <table className="watch-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {[...items]
                    .sort((a, b) => b.max_price_cents - a.max_price_cents)
                    .slice(0, 10)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{normalizeType(item.notes)}</td>
                        <td>{item.card_name}</td>
                        <td>{formatPrice(item.max_price_cents)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
