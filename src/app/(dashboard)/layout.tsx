import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Video,
  Users,
  Settings,
  Menu,
  User,
  LogOut,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  const role = session.user.role;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Video className="h-6 w-6 text-primary" />
            <span className="text-xl">EduStream</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          <SidebarItem
            href="/dashboard"
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            active
          />
          {role === "TEACHER" && (
            <>
              <SidebarItem
                href="/dashboard/videos"
                icon={<Video className="h-5 w-5" />}
                label="My Videos"
              />
              <SidebarItem
                href="/dashboard/students"
                icon={<Users className="h-5 w-5" />}
                label="Students"
              />
            </>
          )}
          {role === "STUDENT" && (
            <SidebarItem
              href="/library"
              icon={<Video className="h-5 w-5" />}
              label="My Library"
            />
          )}
        </nav>
        <div className="mt-auto border-t p-4">
          <SidebarItem
            href="/settings"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col sm:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <Video className="h-6 w-6 text-primary" />
                  <span className="text-xl">EduStream</span>
                </Link>
              </div>
              <nav className="space-y-1 px-4 py-4">
                <MobileSidebarItems role={role} />
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex-1 font-semibold text-lg">
            {role === "TEACHER" ? "Teacher Dashboard" : "Student Library"}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{session.user.name}</span>
                  <span className="text-xs text-muted-foreground uppercase">{role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/profile">Profile</Link>}
              />
              <DropdownMenuItem
                render={<Link href="/settings">Settings</Link>}
              />
              <DropdownMenuSeparator />
              <form
                action={async () => {
                  "use server";
                  const response = await fetch("/api/auth/signout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  });
                  if (!response.ok) {
                    console.error("Sign out failed");
                  }
                }}
              >
                <DropdownMenuItem
                  render={
                    <button className="flex w-full items-center text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  }
                />
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileSidebarItems({ role }: { role: string }) {
  return (
    <>
      <SidebarItem
        href="/dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        label="Dashboard"
        active
      />
      {role === "TEACHER" && (
        <>
          <SidebarItem
            href="/dashboard/videos"
            icon={<Video className="h-5 w-5" />}
            label="My Videos"
          />
          <SidebarItem
            href="/dashboard/students"
            icon={<Users className="h-5 w-5" />}
            label="Students"
          />
        </>
      )}
      {role === "STUDENT" && (
        <SidebarItem
          href="/library"
          icon={<Video className="h-5 w-5" />}
          label="My Library"
        />
      )}
      <SidebarItem
        href="/settings"
        icon={<Settings className="h-5 w-5" />}
        label="Settings"
      />
    </>
  );
}
