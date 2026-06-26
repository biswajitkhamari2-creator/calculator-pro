import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sidheswar Calculator — Modern Stylish Calculator" },
      { name: "description", content: "Sidheswar Calculator: a modern, stylish glassmorphism calculator with history, memory, scientific mode, and dark mode." },
      { property: "og:title", content: "Sidheswar Calculator" },
      { property: "og:description", content: "A modern stylish calculator with history, memory, and dark mode." },
    ],
  }),
  component: Calculator,
});
