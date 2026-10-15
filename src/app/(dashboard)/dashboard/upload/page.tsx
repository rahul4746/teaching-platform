import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UploadVideoForm from "./upload-form";

export default async function UploadPage() {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Upload Video</h2>
        <p className="text-muted-foreground">
          Share a new educational video with your students.
        </p>
      </div>
      <UploadVideoForm userId={session.user.id} />
    </div>
  );
}
