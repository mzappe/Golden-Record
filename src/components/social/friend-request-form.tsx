"use client";

import { useActionState } from "react";
import { sendFriendRequest, type SocialActionState } from "@/app/actions";

export function FriendRequestForm() {
  const [state, action, pending] = useActionState<SocialActionState, FormData>(sendFriendRequest, null);

  return (
    <form action={action} className="social-request-form">
      <label className="form-field-wrap">
        <span className="form-label">Add Friend by Email</span>
        <input
          name="friend_email"
          type="email"
          placeholder="friend@example.com"
          className="field"
          autoComplete="off"
          required
        />
      </label>
      <div className="form-actions">
        <button className="btn-secondary" type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send Request"}
        </button>
      </div>
      {state?.error ? <p className="form-status form-status-error">{state.error}</p> : null}
      {state?.ok && state.message ? <p className="form-status form-status-ok">{state.message}</p> : null}
    </form>
  );
}
