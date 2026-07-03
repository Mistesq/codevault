import { auth } from "@/auth";
import { HomeNav } from "@/components/home/HomeNav";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthed = Boolean(session?.user);

  return (
    <div className="home flex min-h-screen flex-col bg-h-bg text-h-text">
      <HomeNav isAuthed={isAuthed} sectionBase="/" />
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-24">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
