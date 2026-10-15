export type LessonStatus = "ready" | "processing" | "failed";
export type LessonTopic = "math" | "science" | "writing" | "physics";

export type Lesson = {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: LessonTopic;
  duration: string;
  durationSeconds: number;
  progress: number;
  status: LessonStatus;
  visibility: "private" | "public";
  students: number;
  createdAt: string;
  gradient: string;
};

export const teacher = {
  name: "Priya Nair",
  initials: "PN",
  title: "Mathematics & Science",
};

export const student = {
  name: "Arjun Mehta",
  initials: "AM",
  year: "Grade 10",
};

export const initialLessons: Lesson[] = [
  {
    id: "linear-equations",
    title: "Solving Linear Equations",
    description:
      "A practical walkthrough of balancing equations, isolating variables, and checking your answers.",
    subject: "Mathematics",
    topic: "math",
    duration: "12:46",
    durationSeconds: 766,
    progress: 68,
    status: "ready",
    visibility: "private",
    students: 18,
    createdAt: "Today",
    gradient: "from-indigo-600 via-violet-600 to-fuchsia-500",
  },
  {
    id: "photosynthesis",
    title: "Photosynthesis: How Plants Make Food",
    description:
      "Follow the journey from sunlight to sugar and discover why plants are essential to life on Earth.",
    subject: "Science",
    topic: "science",
    duration: "09:18",
    durationSeconds: 558,
    progress: 0,
    status: "ready",
    visibility: "private",
    students: 14,
    createdAt: "Yesterday",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    id: "newtons-laws",
    title: "Newton’s Three Laws of Motion",
    description:
      "Learn how force, mass, and motion work together through everyday examples and clear diagrams.",
    subject: "Physics",
    topic: "physics",
    duration: "14:42",
    durationSeconds: 882,
    progress: 22,
    status: "ready",
    visibility: "private",
    students: 16,
    createdAt: "Apr 18",
    gradient: "from-orange-500 via-amber-500 to-yellow-400",
  },
  {
    id: "essay-introduction",
    title: "Writing a Strong Essay Introduction",
    description:
      "Build a compelling opening with a hook, context, and a focused thesis statement.",
    subject: "English",
    topic: "writing",
    duration: "07:55",
    durationSeconds: 475,
    progress: 100,
    status: "ready",
    visibility: "private",
    students: 11,
    createdAt: "Apr 15",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
  },
  {
    id: "cells-in-motion",
    title: "Cells in Motion",
    description: "An upcoming biology lesson that is still being prepared.",
    subject: "Biology",
    topic: "science",
    duration: "—",
    durationSeconds: 0,
    progress: 0,
    status: "processing",
    visibility: "private",
    students: 0,
    createdAt: "Apr 19",
    gradient: "from-slate-500 via-slate-600 to-slate-700",
  },
];

export const lessonStudents = [
  { id: "arjun", name: "Arjun Mehta", email: "arjun@example.com", initials: "AM", color: "bg-indigo-100 text-indigo-700" },
  { id: "mia", name: "Mia Shah", email: "mia@example.com", initials: "MS", color: "bg-rose-100 text-rose-700" },
  { id: "yusuf", name: "Yusuf Khan", email: "yusuf@example.com", initials: "YK", color: "bg-amber-100 text-amber-700" },
];
