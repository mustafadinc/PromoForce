export const DESIGN_ASSETS = {
  mockup3D:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBPfcX2vPDjl4Ka7sEbb8gAMyxB0fyUu1EnpUraO_JfvipGZ5aAs90ETSIKBd_wQpz7CsHCpp733jUdvjQh97SEVHPpQ0cd3FzdRgJfGA8B0dNFKkCl1elAZ5JN4yNiHroIX9demzJBHhhe_iGW88K8MiMVaKgMWrUg4gDznSxPP9GKrgOCyJ_66fWn4cK86PXz2GaB2i3XxHXKdgIxdhwxBi5MTxLuvh0sK5Br-gII4fFRhAIuoaPojeiMl7lPK1xKjm1Z4epXtfM",
  userAvatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAbn94fRn_yCtekSsFwtZ5cMXlxuEyfhxvg5NWnA08tywzUMrQyLLyWkjUuPPwWokyxd5OgIXdqHO7ae2Y7ql6i1QzkJsKppDITZTa0snz3B-_cIufoYNGyjDUGQlhGmTBtXjidYw7waHu_wuO1DiaqoT_QOQV7Jz1Odd9JoDsVw92XJ0ByD69Hju7dLSxy4zDAmqsUkbguYoAFrtOJPDYGnsJSwA6huvZFO7VTbgkRbpA9qxfQeWSvxpL-nlSqqpaMXj3w8e-Yf3A",
} as const;

export type AccentTheme = "teal" | "violet" | "gold";

export const ACCENT_THEMES: Array<{ id: AccentTheme; color: string; label: string }> = [
  { id: "teal", color: "#45d6b5", label: "Teal" },
  { id: "violet", color: "#8b5cf6", label: "Violet" },
  { id: "gold", color: "#fbbf24", label: "Gold" },
];
