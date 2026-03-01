"use client";

import { useActionState } from "react";
import { createWatchTarget, type WatchTargetActionState } from "@/app/actions";

export function WatchTargetForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<WatchTargetActionState, FormData>(createWatchTarget, null);

  return (
    <form action={action} className="form-grid">
      <label className="form-field-wrap">
        <span className="form-label">Type</span>
        <select name="item_type" className="field" defaultValue="game" disabled={disabled}>
          <option value="game">Game</option>
          <option value="card">Card</option>
          <option value="magazine">Magazine</option>
        </select>
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Title</span>
        <input name="card_name" placeholder="Super Mario Sunshine" className="field" disabled={disabled} required />
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Series / Platform / Set</span>
        <input name="set_name" placeholder="GameCube" className="field" disabled={disabled} required />
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Catalog ID</span>
        <input name="card_number" placeholder="DOL-GMSP-USA" className="field" disabled={disabled} required />
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Condition (1-10)</span>
        <input name="grade_value" type="number" min={1} max={10} step={0.5} defaultValue={8} className="field" disabled={disabled} required />
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Target Price (USD)</span>
        <input name="max_price_dollars" type="number" min={1} step={0.01} placeholder="199.99" className="field" disabled={disabled} required />
      </label>

      <label className="form-field-wrap">
        <span className="form-label">Cover Art URL (optional)</span>
        <input name="cover_url" type="url" placeholder="https://..." className="field" disabled={disabled} />
      </label>

      <label className="form-field-wrap form-checkbox-wrap">
        <span className="form-label">Social</span>
        <span className="checkbox-line">
          <input name="is_shared" type="checkbox" defaultChecked disabled={disabled} />
          Share with friends
        </span>
      </label>

      <input type="hidden" name="grade_company" value="PSA" />

      <div className="form-actions">
        <button type="submit" disabled={disabled || pending} className="btn-primary">
          {pending ? "Saving..." : "Save Item"}
        </button>
      </div>

      {state?.error ? <p className="form-status form-status-error">{state.error}</p> : null}
      {!state?.error && state?.ok ? <p className="form-status form-status-ok">Saved.</p> : null}
    </form>
  );
}
