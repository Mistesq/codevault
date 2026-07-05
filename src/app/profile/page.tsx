import { Calendar, Code, FolderOpen, Mail } from "lucide-react";

import { getProfileData } from "@/lib/db/profile";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { formatLongDate } from "@/lib/dashboard-data";
import { pluralTypeLabel, TypeIcon } from "@/lib/type-icons";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // The session is verified by the profile layout's AppShell guard.
  const profile = await getProfileData();
  const accountType = profile.hasPassword ? "Email account" : "GitHub account";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      {/* Account information */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Account Information</h2>

        <div className="mt-4 flex items-center gap-4">
          <UserAvatar name={profile.name} image={profile.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{accountType}</p>
          </div>
          {profile.isPro && (
            <span className="ml-auto rounded-full bg-sidebar-primary px-2.5 py-0.5 text-xs font-medium text-sidebar-primary-foreground">
              PRO
            </span>
          )}
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">Email:</dt>
            <dd className="truncate font-medium">{profile.email}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">Member since:</dt>
            <dd className="font-medium">
              {formatLongDate(profile.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Usage statistics */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Usage Statistics</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <Code className="size-5" />
            </span>
            <div className="overflow-hidden">
              <p className="text-2xl font-semibold leading-none">
                {profile.totalItems}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Total Items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
              <FolderOpen className="size-5" />
            </span>
            <div className="overflow-hidden">
              <p className="text-2xl font-semibold leading-none">
                {profile.totalCollections}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Collections
              </p>
            </div>
          </div>
        </div>

        <h3 className="mt-6 text-xs font-medium text-muted-foreground">
          Items by Type
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profile.typeBreakdown.map((type) => (
            <li
              key={type.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <TypeIcon
                  name={type.icon}
                  className="size-4 shrink-0"
                  style={type.color ? { color: type.color } : undefined}
                />
                <span className="truncate">{pluralTypeLabel(type.name)}</span>
              </span>
              <span className="font-semibold tabular-nums">{type.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
