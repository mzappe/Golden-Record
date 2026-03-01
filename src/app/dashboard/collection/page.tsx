import Link from "next/link";
import type { CSSProperties } from "react";
import { stripCoverArt, upsertCoverArt } from "@/app/actions";
import { WatchTargetForm } from "@/components/watch-target-form";
import { createClient } from "@/lib/supabase/server";

type Item = {
  id: string;
  card_name: string;
  set_name: string;
  card_number: string;
  grade_value: number;
  max_price_cents: number;
  notes: string | null;
  cover_url: string | null;
  is_shared: boolean;
};

type ItemType = "game" | "card" | "magazine";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function normalizeType(raw: string | null): ItemType {
  if (raw === "game" || raw === "card" || raw === "magazine") {
    return raw;
  }
  return "game";
}

function formatType(type: ItemType) {
  if (type === "card") return "Card";
  if (type === "magazine") return "Magazine";
  return "Game";
}

function coverArtStyle(coverUrl: string | null): CSSProperties | undefined {
  if (!coverUrl) return undefined;
  return { "--cover-art-url": `url("${encodeURI(coverUrl)}")` } as CSSProperties;
}

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("watch_targets")
    .select("id, card_name, set_name, card_number, grade_value, max_price_cents, notes, cover_url, is_shared")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as Item[];

  const totals = {
    game: 0,
    card: 0,
    magazine: 0
  } as Record<ItemType, number>;

  for (const item of items) {
    totals[normalizeType(item.notes)] += 1;
  }

  return (
    <section className="channel-view">
      <header className="channel-view-head">
        <Link href="/dashboard" className="channel-back">
          Menu
        </Link>
        <h1>Collection</h1>
      </header>

      <section className="channel-stack">
        <article className="panel">
          <p className="panel-title">Library</p>
          <div className="type-strip" role="list" aria-label="Collection type counts">
            <p className="type-pill" role="listitem">
              Games {totals.game}
            </p>
            <p className="type-pill" role="listitem">
              Cards {totals.card}
            </p>
            <p className="type-pill" role="listitem">
              Magazines {totals.magazine}
            </p>
            <p className="type-pill" role="listitem">
              Shared {items.filter((item) => item.is_shared).length}
            </p>
          </div>
        </article>

        <article className="panel">
          <p className="panel-title">Add Item</p>
          <WatchTargetForm disabled={false} />
        </article>

        <article className="panel">
          <p className="panel-title">Visual Shelf</p>
          {items.length === 0 ? (
            <p className="empty-state">Add an item to build your visual shelf.</p>
          ) : (
            <div className="cover-grid">
              {items.map((item) => (
                <article className="cover-card" key={item.id}>
                  <div className="cover-art" style={coverArtStyle(item.cover_url)}>
                    {item.cover_url ? <span className="sr-only">{item.card_name} cover art</span> : <span>No Cover</span>}
                  </div>
                  <p className="list-title">{item.card_name}</p>
                  <p className="muted-small">
                    {formatType(normalizeType(item.notes))} • {item.set_name}
                  </p>
                  <form action={upsertCoverArt} className="cover-edit-form">
                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      name="cover_url"
                      type="url"
                      className="field"
                      placeholder="https://..."
                      defaultValue={item.cover_url ?? ""}
                      required
                    />
                    <button className="btn-secondary" type="submit">
                      Save Cover
                    </button>
                  </form>
                  <form action={stripCoverArt}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <button className="btn-dark" type="submit" disabled={!item.cover_url}>
                      Strip Cover
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="panel-title">All Items</p>
          {items.length === 0 ? (
            <p className="empty-state">No items saved yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="watch-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Series</th>
                    <th>Catalog</th>
                    <th>Condition</th>
                    <th>Target</th>
                    <th>Social</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatType(normalizeType(item.notes))}</td>
                      <td>{item.card_name}</td>
                      <td>{item.set_name}</td>
                      <td>{item.card_number}</td>
                      <td>{item.grade_value}</td>
                      <td>{formatPrice(item.max_price_cents)}</td>
                      <td>{item.is_shared ? "Shared" : "Private"}</td>
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
