import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculator — Fast, Beautiful, Keyboard-Friendly" },
      { name: "description", content: "A modern glassmorphism calculator with history, memory, scientific mode, and dark mode. Works on mobile and desktop." },
      { property: "og:title", content: "Calculator" },
      { property: "og:description", content: "Modern Apple-inspired calculator with history, memory, and dark mode." },
    ],
  }),
  component: Calculator,
});
