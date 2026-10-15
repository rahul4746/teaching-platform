"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Loader2 } from "lucide-react";
import { VIDEO_MAX_SIZE_BYTES } from "@/lib/video-schema";

const uploadSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(140, "Title too long"),
  description: z
    .string()
    .max(5000, "Description too long")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("")),
  tags: z
    .string()
    .max(500)
    .optional()
    .or(z.literal("")),
});

type UploadInput = z.infer<typeof uploadSchema>;

interface UploadVideoFormProps {
  userId: string;
}

export default function UploadVideoForm({ userId }: UploadVideoFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UploadInput>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: "",
    },
  });

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    if (selectedFile.size > VIDEO_MAX_SIZE_BYTES) {
      setError("File must be under 5 GiB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  async function onSubmit(values: UploadInput) {
    if (!file) {
      setError("Please select a video file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const contentType = file.type || "video/mp4";
      const prepareResponse = await fetch("/api/videos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType, size: file.size }),
      });
      const prepared = await prepareResponse.json().catch(() => null);
      if (!prepareResponse.ok || !prepared?.uploadUrl || !prepared?.key) throw new Error(prepared?.error || "Unable to prepare the upload.");

      const uploadResponse = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!uploadResponse.ok) throw new Error("Video upload failed. Please try again.");

      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: values.title, description: values.description || undefined, category: values.category || undefined, tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [], size: file.size, mimeType: contentType, uploadKey: prepared.key, isPublic: false }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Upload failed. Please try again.");
      }

      router.push("/dashboard/videos");
      router.refresh();
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
      setIsUploading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload New Video</CardTitle>
        <CardDescription>
          Select a video file and provide details. Videos under 5GB are
          supported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0] || null);
          }}
          onClick={() => document.getElementById("video-file-input")?.click()}
        >
          <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-1 text-sm font-medium">
            {file ? file.name : "Drag & drop your video here"}
          </p>
          {!file && (
            <p className="text-xs text-muted-foreground">
              or click to browse files (MP4, WebM, etc.)
            </p>
          )}
          {file && (
            <p className="mt-2 text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
          <input
            id="video-file-input"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Introduction to Photosynthesis"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief summary of this video..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Mathematics, Science"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., algebra, chapter-3 (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isUploading || !file}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading Video...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
