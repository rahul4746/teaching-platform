import { auth } from "@/auth";
import { db } from "@/lib/db";
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
import { PlusCircle, Video, Eye, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const videos = await db.video.findMany({
    where: { teacherId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      isPublic: true,
      viewCount: true,
      duration: true,
      createdAt: true,
      thumbnailUrl: true,
      _count: {
        select: { enrollments: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Videos</h2>
          <p className="text-muted-foreground">
            Manage and organize your educational videos.
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Upload New Video
          </Button>
        </Link>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">No videos yet</h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Upload your first educational video to share with your students.
            </p>
            <Link href="/dashboard/upload">
              <Button>Upload Your First Video</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div className="aspect-video w-full bg-gray-100 relative">
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
                <Badge
                  className={`absolute left-3 top-3 ${
                    video.status === "READY"
                      ? "bg-green-500"
                      : video.status === "PROCESSING"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  variant="secondary"
                >
                  {video.status}
                </Badge>
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="line-clamp-1 text-base">{video.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm">
                  {video.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center justify-between p-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {video.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant={video.isPublic ? "default" : "outline"}>
                  {video.isPublic ? "Public" : "Private"}
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
