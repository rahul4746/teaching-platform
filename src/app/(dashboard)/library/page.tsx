import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Clock, Eye, BookOpen } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // Videos the student is enrolled in, plus public videos
  const enrolledVideos = await db.video.findMany({
    where: {
      enrollments: { some: { studentId: userId } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      status: true,
      viewCount: true,
      duration: true,
      createdAt: true,
      teacher: { select: { name: true } },
    },
  });

  const publicVideos = await db.video.findMany({
    where: {
      isPublic: true,
      status: "READY",
      enrollments: { none: { studentId: userId } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      status: true,
      viewCount: true,
      duration: true,
      createdAt: true,
      teacher: { select: { name: true } },
    },
  });

  const allVideos = [...enrolledVideos, ...publicVideos];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">My Library</h2>
        </div>
        <p className="mt-1 text-muted-foreground">
          Videos shared with you by your teachers, plus public lessons.
        </p>
      </div>

      {allVideos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Nothing here yet</h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              When your teacher shares a lesson with you, it&apos;ll show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allVideos.map((video) => (
            <Link key={video.id} href={`/watch/${video.id}`} className="block">
              <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-video w-full bg-gray-100">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Video className="h-10 w-10 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                      <Play className="ml-1 h-6 w-6 text-primary" />
                    </span>
                  </div>
                  {video.status === "PROCESSING" && (
                    <Badge className="absolute left-3 top-3 bg-amber-500" variant="secondary">
                      Processing
                    </Badge>
                  )}
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {video.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {video.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex items-center justify-between p-4 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {video.teacher?.name && (
                      <span className="font-medium text-foreground/80">
                        {video.teacher.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {video.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(video.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
