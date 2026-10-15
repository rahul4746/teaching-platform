"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  title: string;
}

export function VideoPlayer({ videoId, videoUrl, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Fetch saved progress on mount
  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const response = await fetch(`/api/videos/${videoId}/progress`, {
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        const savedTime = data?.progress?.currentTime;
        if (typeof savedTime === "number" && savedTime > 0 && videoRef.current) {
          videoRef.current.currentTime = savedTime;
          setCurrentTime(savedTime);
        }
      } catch {
        // Non-fatal: resume from start if progress fetch fails
      } finally {
        if (!cancelled) setIsLoadingProgress(false);
      }
    }

    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Save progress periodically and on unmount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const saveProgress = async (completed = false) => {
      const time = Math.floor(video.currentTime || 0);
      try {
        await fetch(`/api/videos/${videoId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ currentTime: time, completed }),
        });
      } catch {
        // Non-fatal: progress sync is best-effort
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.floor(video.currentTime || 0));
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          void saveProgress();
        }, 5000);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      void saveProgress(true);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      if (timer) clearTimeout(timer);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);

      // Save final position on unmount
      void saveProgress();
    };
  }, [videoId]);

  return (
    <div className="overflow-hidden rounded-xl border bg-black shadow-lg">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={undefined}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        aria-label={title}
      />
      {isLoadingProgress && (
        <div className="flex items-center gap-2 border-t border-white/10 bg-black/60 px-4 py-2 text-xs text-white/70">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          Resuming from where you left off…
        </div>
      )}
    </div>
  );
}
