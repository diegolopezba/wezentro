import { m } from "framer-motion";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Todos", emoji: "✨" },
  { id: "party", label: "Fiestas", emoji: "🪩" },
  { id: "bar", label: "Bares", emoji: "🍸" },
  { id: "concert", label: "Conciertos", emoji: "🎵" },
  { id: "festival", label: "Festivales", emoji: "🎪" },
  { id: "rooftop", label: "Rooftops", emoji: "🌆" },
  { id: "restaurant", label: "Restaurantes", emoji: "🍽️" },
  { id: "coffee", label: "Café", emoji: "☕" },
  { id: "fitness", label: "Fitness", emoji: "🏋️" },
  { id: "culture", label: "Arte y Cultura", emoji: "🎨" },
  { id: "adventure", label: "Aventura", emoji: "🏔️" },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
      {categories.map((category) => {
        const isSelected = selected === category.id;
        
        return (
          <m.button
            key={category.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap",
              isSelected
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            <span>{category.emoji}</span>
            <span className="text-sm font-medium">{category.label}</span>
          </m.button>
        );
      })}
    </div>
  );
};
