import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Video, Users, Eye, Settings } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user.id;

  const stats = await db.$transaction([
    db.video.count({ where: { teacherId: userId } }),
    db.enrollment.count({ where: { video: { teacherId: userId } } }),
    db.video.aggregate({
      where: { teacherId: userId },
      _sum: { viewCount: true }
    })
  ]);

  const [videoCount, studentCount, viewData] = stats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            Manage your educational content and student access.
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoCount}</div>
            <p className="text-xs text-muted-foreground">
              Uploaded to your library
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground">
              With access to your videos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewData._sum.viewCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all content
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Videos</CardTitle>
            <CardDescription>
              Your most recently uploaded educational content.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col items-center justify-center py-10 text-center">
                <Video className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No videos uploaded yet.</p>
                <Link href="/dashboard/upload" className="mt-4">
                  <Button variant="outline" size="sm">Upload your first video</Button>
                </Link>
             </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/students" className="w-full">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Manage Student Access
              </Button>
            </Link>
            <Link href="/dashboard/settings" className="w-full">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Dashboard Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
