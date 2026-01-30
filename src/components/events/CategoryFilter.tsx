import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Todos", emoji: "✨" },
  { id: "club", label: "Clubs", emoji: "🪩" },
  { id: "bar", label: "Bares", emoji: "🍸" },
  { id: "concert", label: "Conciertos", emoji: "🎵" },
  { id: "festival", label: "Festivales", emoji: "🎪" },
  { id: "house_party", label: "Fiestas", emoji: "🏠" },
  { id: "rooftop", label: "Rooftops", emoji: "🌆" },
  { id: "restaurant", label: "Restaurantes", emoji: "🍽️" },
  { id: "coffee", label: "Café", emoji: "☕" },
  { id: "fitness", label: "Fitness", emoji: "🏋️" },
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
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200",
              isSelected
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <span>{category.emoji}</span>
            <span className="text-sm font-medium">{category.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
