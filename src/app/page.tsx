import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  }

  const { error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Movie Memory</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Save your favorite movie and discover fun facts about it.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Sign-in failed. Please try again.
        </p>
      )}

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
