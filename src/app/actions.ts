"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const optionalUrlSchema = z
  .preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z
      .string()
      .url()
      .max(2048)
      .refine((value) => value.startsWith("https://") || value.startsWith("http://"), "URL must start with http:// or https://")
      .optional()
  )
  .transform((value) => value ?? null);

const watchTargetSchema = z.object({
  item_type: z.enum(["game", "card", "magazine"]),
  card_name: z.string().trim().min(2),
  set_name: z.string().trim().min(1),
  card_number: z.string().trim().min(1),
  grade_company: z.enum(["PSA", "BGS", "CGC"]),
  grade_value: z.coerce.number().min(1).max(10),
  max_price_cents: z.coerce.number().int().min(100),
  cover_url: optionalUrlSchema,
  is_shared: z.boolean().default(true)
});

const coverArtSchema = z.object({
  item_id: z.string().uuid(),
  cover_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), "URL must start with http:// or https://")
});

const itemIdentitySchema = z.object({
  item_id: z.string().uuid()
});

const friendshipActionSchema = z.object({
  friendship_id: z.string().uuid()
});

const friendRequestSchema = z.object({
  friend_email: z.string().trim().email().toLowerCase()
});

const socialMessageSchema = z.object({
  recipient_id: z.string().uuid(),
  message: z.string().trim().min(1).max(800)
});

export type AuthActionState = {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
  email?: string;
} | null;

export type WatchTargetActionState = {
  ok: boolean;
  error?: string;
} | null;

export type SocialActionState = {
  ok: boolean;
  error?: string;
  message?: string;
} | null;

export async function createWatchTarget(_: WatchTargetActionState, formData: FormData): Promise<WatchTargetActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to add items." };
  }

  const dollarsRaw = Number(formData.get("max_price_dollars") ?? "0");
  const maxPriceCents = Number.isFinite(dollarsRaw) && dollarsRaw > 0 ? Math.round(dollarsRaw * 100) : Number(formData.get("max_price_cents") ?? "0");

  const parsed = watchTargetSchema.safeParse({
    item_type: formData.get("item_type"),
    card_name: formData.get("card_name"),
    set_name: formData.get("set_name"),
    card_number: formData.get("card_number"),
    grade_company: formData.get("grade_company"),
    grade_value: formData.get("grade_value"),
    max_price_cents: maxPriceCents,
    cover_url: formData.get("cover_url"),
    is_shared: formData.get("is_shared") === "on"
  });

  if (!parsed.success) {
    return { ok: false, error: "Please fill every field with valid values." };
  }

  const { item_type, cover_url, is_shared, ...targetData } = parsed.data;

  const { error } = await supabase.from("watch_targets").insert({
    user_id: user.id,
    ...targetData,
    notes: item_type,
    cover_url,
    is_shared
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/collection");
  revalidatePath("/dashboard/market");
  revalidatePath("/dashboard/play");

  return { ok: true };
}

export async function signIn(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signUp(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.session) {
    return {
      ok: true,
      needsEmailConfirmation: true,
      email
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function upsertCoverArt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = coverArtSchema.safeParse({
    item_id: formData.get("item_id"),
    cover_url: formData.get("cover_url")
  });

  if (!parsed.success) {
    return;
  }

  await supabase.from("watch_targets").update({ cover_url: parsed.data.cover_url }).eq("id", parsed.data.item_id).eq("user_id", user.id);

  revalidatePath("/dashboard/collection");
  revalidatePath("/dashboard/social");
}

export async function stripCoverArt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = itemIdentitySchema.safeParse({
    item_id: formData.get("item_id")
  });

  if (!parsed.success) {
    return;
  }

  await supabase.from("watch_targets").update({ cover_url: null }).eq("id", parsed.data.item_id).eq("user_id", user.id);

  revalidatePath("/dashboard/collection");
  revalidatePath("/dashboard/social");
}

export async function sendFriendRequest(_: SocialActionState, formData: FormData): Promise<SocialActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to add friends." };
  }

  const parsed = friendRequestSchema.safeParse({
    friend_email: formData.get("friend_email")
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", parsed.data.friend_email)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (!targetProfile) {
    return { ok: false, error: "No user found with that email." };
  }

  if (targetProfile.id === user.id) {
    return { ok: false, error: "You cannot add yourself." };
  }

  const friendshipFilter = `and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`;
  const { data: existingFriendship, error: existingError } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .or(friendshipFilter)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      return { ok: false, error: "You are already connected." };
    }

    if (existingFriendship.status === "pending") {
      if (existingFriendship.friend_id === user.id) {
        const { error: acceptError } = await supabase
          .from("friendships")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString()
          })
          .eq("id", existingFriendship.id);

        if (acceptError) {
          return { ok: false, error: acceptError.message };
        }

        revalidatePath("/dashboard/social");
        return { ok: true, message: "Friend request accepted." };
      }

      return { ok: false, error: "Friend request already sent." };
    }

    const { error: resetError } = await supabase
      .from("friendships")
      .update({
        user_id: user.id,
        friend_id: targetProfile.id,
        status: "pending",
        responded_at: null
      })
      .eq("id", existingFriendship.id);

    if (resetError) {
      return { ok: false, error: resetError.message };
    }

    revalidatePath("/dashboard/social");
    return { ok: true, message: "Friend request sent." };
  }

  const { error } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: targetProfile.id,
    status: "pending"
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/social");
  return { ok: true, message: "Friend request sent." };
}

export async function acceptFriendRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = friendshipActionSchema.safeParse({
    friendship_id: formData.get("friendship_id")
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("friendships")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString()
    })
    .eq("id", parsed.data.friendship_id)
    .eq("friend_id", user.id)
    .eq("status", "pending");

  revalidatePath("/dashboard/social");
}

export async function declineFriendRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const parsed = friendshipActionSchema.safeParse({
    friendship_id: formData.get("friendship_id")
  });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("friendships")
    .update({
      status: "declined",
      responded_at: new Date().toISOString()
    })
    .eq("id", parsed.data.friendship_id)
    .eq("friend_id", user.id)
    .eq("status", "pending");

  revalidatePath("/dashboard/social");
}

export async function sendSocialMessage(_: SocialActionState, formData: FormData): Promise<SocialActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to chat." };
  }

  const parsed = socialMessageSchema.safeParse({
    recipient_id: formData.get("recipient_id"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a message before sending." };
  }

  if (parsed.data.recipient_id === user.id) {
    return { ok: false, error: "Cannot send a message to yourself." };
  }

  const friendshipFilter = `and(user_id.eq.${user.id},friend_id.eq.${parsed.data.recipient_id}),and(user_id.eq.${parsed.data.recipient_id},friend_id.eq.${user.id})`;
  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(friendshipFilter)
    .maybeSingle();

  if (friendshipError) {
    return { ok: false, error: friendshipError.message };
  }

  if (!friendship) {
    return { ok: false, error: "Connect as friends before sending messages." };
  }

  const { error } = await supabase.from("social_messages").insert({
    sender_id: user.id,
    recipient_id: parsed.data.recipient_id,
    message: parsed.data.message
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/social");
  return { ok: true, message: "Sent." };
}
