"use client";

import { useActionState, useState } from "react";
import { saveFavoriteMovie, type OnboardingState } from "./actions";

const initialState: OnboardingState = { error: null, title: "" };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(saveFavoriteMovie, initialState);
  // Controlled so React's post-action form reset can't clear what the user typed.
  // Seeded from state so the no-JavaScript render shows the submitted value.
  const [title, setTitle] = useState(state.title);

  return (
    <form action={formAction} noValidate className="flex w-full flex-col gap-3">
      <label htmlFor="title" className="text-sm font-medium">
        Favorite movie
      </label>
      <input
        id="title"
        name="title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoComplete="off"
        placeholder="e.g. Spirited Away"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "title-error" : undefined}
        className="h-11 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-zinc-50 placeholder:text-zinc-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 aria-invalid:border-red-400"
      />
      <p
        id="title-error"
        aria-live="polite"
        className="min-h-5 text-sm text-red-400"
      >
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
