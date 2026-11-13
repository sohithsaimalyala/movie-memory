import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFirstName } from "@/lib/display";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.favoriteMovie) {
    redirect("/dashboard");
  }

  const firstName = getFirstName(user.name);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold [overflow-wrap:anywhere]">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <p className="text-zinc-400">
            What&apos;s your favorite movie?
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
