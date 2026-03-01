import Link from "next/link";
import type { CSSProperties } from "react";
import { acceptFriendRequest, declineFriendRequest } from "@/app/actions";
import { ChatComposeForm } from "@/components/social/chat-compose-form";
import { FriendRequestForm } from "@/components/social/friend-request-form";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
};

type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "declined";
  requester: Profile | null;
  receiver: Profile | null;
};

type SharedItem = {
  id: string;
  card_name: string;
  set_name: string;
  notes: string | null;
  cover_url: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  sender: Pick<Profile, "display_name" | "email"> | null;
};

type SocialPageProps = {
  searchParams?: Promise<{ friend?: string | string[] }>;
};

function friendLabel(profile: Profile) {
  return profile.display_name?.trim() || profile.email;
}

function formatMessageTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatType(raw: string | null) {
  if (raw === "card") return "Card";
  if (raw === "magazine") return "Magazine";
  return "Game";
}

function coverArtStyle(coverUrl: string | null): CSSProperties | undefined {
  if (!coverUrl) return undefined;
  return { "--cover-art-url": `url("${encodeURI(coverUrl)}")` } as CSSProperties;
}

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const params: { friend?: string | string[] } = await (searchParams ?? Promise.resolve({}));
  const friendParamRaw = params.friend;
  const friendParam = Array.isArray(friendParamRaw) ? friendParamRaw[0] : friendParamRaw;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select(
      "id, user_id, friend_id, status, requester:profiles!friendships_user_id_fkey(id, email, display_name), receiver:profiles!friendships_friend_id_fkey(id, email, display_name)"
    )
    .or(`user_id.eq.${user?.id ?? ""},friend_id.eq.${user?.id ?? ""}`)
    .order("created_at", { ascending: false });

  if (friendshipError) {
    return (
      <section className="channel-view">
        <header className="channel-view-head">
          <Link href="/dashboard" className="channel-back">
            Menu
          </Link>
          <h1>Social</h1>
        </header>
        <section className="channel-stack">
          <article className="panel">
            <p className="panel-title">Social Setup Required</p>
            <p className="empty-state">Run the latest `supabase/schema.sql` migration so profiles, friendships, and chat tables exist.</p>
          </article>
        </section>
      </section>
    );
  }

  const friendships = (friendshipData ?? []) as unknown as FriendshipRow[];
  const acceptedFriends = friendships
    .filter((row) => row.status === "accepted")
    .map((row) => (row.user_id === user?.id ? row.receiver : row.requester))
    .filter((profile): profile is Profile => Boolean(profile));
  const incomingRequests = friendships.filter((row) => row.status === "pending" && row.friend_id === user?.id);
  const outgoingRequests = friendships.filter((row) => row.status === "pending" && row.user_id === user?.id);

  const selectedFriendId =
    acceptedFriends.find((friend) => friend.id === friendParam)?.id ?? acceptedFriends[0]?.id ?? null;
  const selectedFriend = acceptedFriends.find((friend) => friend.id === selectedFriendId) ?? null;

  let friendCollection: SharedItem[] = [];
  let messageThread: MessageRow[] = [];

  if (selectedFriendId) {
    const [{ data: collectionData }, { data: messageData }] = await Promise.all([
      supabase
        .from("watch_targets")
        .select("id, card_name, set_name, notes, cover_url")
        .eq("user_id", selectedFriendId)
        .eq("is_shared", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("social_messages")
        .select("id, sender_id, recipient_id, message, created_at, sender:profiles!social_messages_sender_id_fkey(display_name, email)")
        .or(
          `and(sender_id.eq.${user?.id ?? ""},recipient_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},recipient_id.eq.${user?.id ?? ""})`
        )
        .order("created_at", { ascending: true })
        .limit(100)
    ]);

    friendCollection = (collectionData ?? []) as SharedItem[];
    messageThread = (messageData ?? []) as unknown as MessageRow[];
  }

  return (
    <section className="channel-view">
      <header className="channel-view-head">
        <Link href="/dashboard" className="channel-back">
          Menu
        </Link>
        <h1>Social</h1>
      </header>

      <section className="channel-stack">
        <div className="social-layout">
          <aside className="social-sidebar">
            <article className="panel">
              <p className="panel-title">Friends</p>
              <p className="muted-small">{acceptedFriends.length} connected</p>
              {acceptedFriends.length === 0 ? (
                <p className="empty-state">No friends yet. Send a request below.</p>
              ) : (
                <div className="social-friend-list">
                  {acceptedFriends.map((friend) => (
                    <Link
                      key={friend.id}
                      href={`/dashboard/social?friend=${friend.id}`}
                      className={`social-friend-link${friend.id === selectedFriendId ? " social-friend-link-active" : ""}`}
                    >
                      <span>{friendLabel(friend)}</span>
                      <span className="muted-small">{friend.email}</span>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <p className="panel-title">Add Friend</p>
              <FriendRequestForm />
              {outgoingRequests.length > 0 ? (
                <p className="muted-small">{outgoingRequests.length} outgoing request{outgoingRequests.length === 1 ? "" : "s"}.</p>
              ) : null}
            </article>

            <article className="panel">
              <p className="panel-title">Incoming Requests</p>
              {incomingRequests.length === 0 ? (
                <p className="empty-state">No pending requests.</p>
              ) : (
                <div className="social-request-list">
                  {incomingRequests.map((request) => {
                    const requester = request.requester;
                    if (!requester) return null;

                    return (
                      <article className="social-request-card" key={request.id}>
                        <p className="list-title">{friendLabel(requester)}</p>
                        <p className="muted-small">{requester.email}</p>
                        <div className="social-request-actions">
                          <form action={acceptFriendRequest}>
                            <input type="hidden" name="friendship_id" value={request.id} />
                            <button className="btn-primary" type="submit">
                              Accept
                            </button>
                          </form>
                          <form action={declineFriendRequest}>
                            <input type="hidden" name="friendship_id" value={request.id} />
                            <button className="btn-dark" type="submit">
                              Decline
                            </button>
                          </form>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>
          </aside>

          <div className="social-main">
            <article className="panel">
              <p className="panel-title">Friend Collection</p>
              {selectedFriend ? <p className="muted-small">{friendLabel(selectedFriend)} shared items</p> : null}
              {!selectedFriend ? (
                <p className="empty-state">Select a friend to view shared covers.</p>
              ) : friendCollection.length === 0 ? (
                <p className="empty-state">No shared items yet.</p>
              ) : (
                <div className="social-cover-grid">
                  {friendCollection.map((item) => (
                    <article className="social-cover-card" key={item.id}>
                      <div className="cover-art" style={coverArtStyle(item.cover_url)}>
                        {item.cover_url ? <span className="sr-only">{item.card_name} cover</span> : <span>No Cover</span>}
                      </div>
                      <p className="list-title">{item.card_name}</p>
                      <p className="muted-small">
                        {formatType(item.notes)} • {item.set_name}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <p className="panel-title">Chat</p>
              {!selectedFriend ? (
                <p className="empty-state">Connect with a friend to start chatting.</p>
              ) : (
                <>
                  <div className="social-chat-feed">
                    {messageThread.length === 0 ? (
                      <p className="empty-state">No messages yet. Start the conversation.</p>
                    ) : (
                      messageThread.map((message) => {
                        const outbound = message.sender_id === user?.id;
                        return (
                          <article className={`social-message${outbound ? " social-message-outbound" : ""}`} key={message.id}>
                            <p className="social-message-author">{outbound ? "You" : message.sender?.display_name || message.sender?.email || "Friend"}</p>
                            <p className="social-message-body">{message.message}</p>
                            <p className="social-message-time">{formatMessageTime(message.created_at)}</p>
                          </article>
                        );
                      })
                    )}
                  </div>
                  <ChatComposeForm recipientId={selectedFriend.id} />
                </>
              )}
            </article>
          </div>
        </div>
      </section>
    </section>
  );
}
