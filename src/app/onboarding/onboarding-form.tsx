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
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 aria-invalid:border-red-500 dark:border-zinc-700 dark:focus:ring-zinc-700"
      />
      <p
        id="title-error"
        aria-live="polite"
        className="min-h-5 text-sm text-red-600 dark:text-red-400"
      >
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
