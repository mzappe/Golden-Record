"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendSocialMessage, type SocialActionState } from "@/app/actions";

export function ChatComposeForm({ recipientId }: { recipientId: string }) {
  const [state, action, pending] = useActionState<SocialActionState, FormData>(sendSocialMessage, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="social-chat-compose">
      <input name="recipient_id" type="hidden" value={recipientId} />
      <label className="form-field-wrap">
        <span className="form-label">Message</span>
        <textarea name="message" className="field social-chat-input" placeholder="Send a quick message..." rows={3} required />
      </label>
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
      {state?.error ? <p className="form-status form-status-error">{state.error}</p> : null}
      {state?.ok && state.message ? <p className="form-status form-status-ok">{state.message}</p> : null}
    </form>
  );
}
