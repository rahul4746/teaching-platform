import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { VideoPlayer } from "./video-player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Eye } from "lucide-react";

import { canViewVideo } from "@/lib/authz";
import { DEMO_MODE, demoUser, demoVideoUrl, demoVideos } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const userId = session.user.id;

  if (DEMO_MODE) {
    const demoVideo = demoVideos.find((video) => video.id === id);
    if (!demoVideo) notFound();
    return <div className="mx-auto max-w-4xl space-y-6"><VideoPlayer videoId={demoVideo.id} videoUrl={demoVideoUrl} title={demoVideo.title} /><Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-2xl">{demoVideo.title}</CardTitle><div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><User className="h-4 w-4" />{demoUser.name}</span><span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{demoVideo.viewCount} views</span><Badge variant="secondary">{demoVideo.category}</Badge></div></div><Badge variant={demoVideo.isPublic ? "default" : "outline"}>{demoVideo.isPublic ? "Public" : "Private"}</Badge></div></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">{demoVideo.description}</CardContent></Card></div>;
  }

  const video = await db.video.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true } },
      enrollments: { where: { studentId: userId }, select: { id: true } },
    },
  });

  if (!video) notFound();

  const hasEnrollment = video.enrollments.length > 0;
  if (!canViewVideo({ id: userId, role: session.user.role }, video, hasEnrollment)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This lesson has not been shared with you yet. Ask your teacher to
              grant you access using the email on your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (video.status === "PROCESSING") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Still Processing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>This video is still being prepared. Check back in a moment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <VideoPlayer videoId={video.id} videoUrl={video.videoUrl} title={video.title} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{video.title}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {video.teacher?.name && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {video.teacher.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {video.viewCount} views
                </span>
                {video.category && (
                  <Badge variant="secondary">{video.category}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Badge variant={video.isPublic ? "default" : "outline"}>
                {video.isPublic ? "Public" : "Private"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {video.description && (
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {video.description}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
