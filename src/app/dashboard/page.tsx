import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAvatarUrl, getFirstName, getInitial } from "@/lib/display";
import { FactCard } from "./fact-card";
import { MovieCard } from "./movie-card";
import { SignOutButton } from "./sign-out-button";
import { UserAvatar } from "./user-avatar";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (!user.favoriteMovie) {
    redirect("/onboarding");
  }

  const firstName = getFirstName(user.name);

  return (
    <>
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400" />
            Movie Memory
          </p>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <UserAvatar
            src={getAvatarUrl(user.image)}
            initial={getInitial(user)}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h1>
            <p className="mt-1 text-zinc-400 [overflow-wrap:anywhere]">
              {user.email ?? "No email on file"}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <MovieCard title={user.favoriteMovie} />
          <FactCard movieTitle={user.favoriteMovie} />
        </div>
      </main>
    </>
  );
}
