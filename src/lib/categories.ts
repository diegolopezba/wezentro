/**
 * Shared event categories used across Create and EditEventSheet.
 */
export const CATEGORIES = [
  { id: "party",      label: "Fiesta",      emoji: "🪩" },
  { id: "bar",        label: "Bar",          emoji: "🍸" },
  { id: "concert",   label: "Concierto",   emoji: "🎵" },
  { id: "festival",  label: "Festival",    emoji: "🎪" },
  { id: "rooftop",   label: "Rooftop",     emoji: "🌆" },
  { id: "restaurant",label: "Restaurante", emoji: "🍽️" },
  { id: "coffee",    label: "Café",         emoji: "☕" },
  { id: "fitness",   label: "Fitness",     emoji: "🏋️" },
  { id: "culture",   label: "Cultura",     emoji: "🎨" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
