import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSessionUser } from "@/lib/session";

// Temporary placeholder for verifying authentication; replaced in Stage 5.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const displayName = user.name ?? user.email ?? "there";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      {user.image ? (
        <Image
          src={user.image}
          alt=""
          width={64}
          height={64}
          className="rounded-full"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold dark:bg-zinc-800"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Signed in as {displayName}</h1>
        {user.email && (
          <p className="text-zinc-600 dark:text-zinc-400">{user.email}</p>
        )}
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
