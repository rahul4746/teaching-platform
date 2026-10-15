export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const demoUser = {
  id: "demo-teacher",
  name: "Aarav Sharma",
  email: "teacher@demo.com",
  role: "TEACHER" as const,
};

export const demoVideos = [
  { id: "demo-photosynthesis", title: "Introduction to Photosynthesis", description: "Learn how plants convert light energy into chemical energy.", thumbnailUrl: null, status: "READY" as const, viewCount: 128, duration: 642, createdAt: new Date("2026-10-10T10:00:00.000Z"), isPublic: false, category: "Biology", teacher: { id: demoUser.id, name: demoUser.name }, enrollments: [{ id: "demo-enrollment" }], _count: { enrollments: 8 } },
  { id: "demo-algebra", title: "Algebra Basics: Linear Equations", description: "Build confidence solving your first linear equations.", thumbnailUrl: null, status: "READY" as const, viewCount: 86, duration: 508, createdAt: new Date("2026-10-08T10:00:00.000Z"), isPublic: true, category: "Mathematics", teacher: { id: demoUser.id, name: demoUser.name }, enrollments: [], _count: { enrollments: 4 } },
  { id: "demo-chemistry", title: "Understanding Chemical Reactions", description: "A visual overview of reactants, products, and energy.", thumbnailUrl: null, status: "PROCESSING" as const, viewCount: 42, duration: 720, createdAt: new Date("2026-10-05T10:00:00.000Z"), isPublic: false, category: "Chemistry", teacher: { id: demoUser.id, name: demoUser.name }, enrollments: [], _count: { enrollments: 0 } },
] as const;

export const demoVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
