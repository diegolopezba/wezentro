import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "party", label: "Fiesta", emoji: "🪩" },
  { value: "bar", label: "Bar", emoji: "🍸" },
  { value: "concert", label: "Concierto", emoji: "🎵" },
  { value: "festival", label: "Festival", emoji: "🎪" },
  { value: "rooftop", label: "Rooftop", emoji: "🌆" },
  { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { value: "coffee", label: "Café", emoji: "☕" },
  { value: "fitness", label: "Fitness", emoji: "🏋️" },
  { value: "culture", label: "Arte y Cultura", emoji: "🎨" },
];

interface CategoryFilterBarProps {
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
}

export const CategoryFilterBar = ({
  selectedCategories,
  onToggleCategory,
}: CategoryFilterBarProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pl-4 pr-4">
      {CATEGORIES.map((category, index) => {
        const isSelected = selectedCategories.includes(category.value);

        return (
          <motion.button
            key={category.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggleCategory(category.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 text-sm",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card/90 backdrop-blur-md text-foreground border border-border/50"
            )}
          >
            <span>{category.emoji}</span>
            <span className="font-medium">{category.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
