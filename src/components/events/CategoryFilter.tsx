import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "club", label: "Clubs", emoji: "🪩" },
  { id: "bar", label: "Bars", emoji: "🍸" },
  { id: "concert", label: "Concerts", emoji: "🎵" },
  { id: "festival", label: "Festivals", emoji: "🎪" },
  { id: "house_party", label: "House Parties", emoji: "🏠" },
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
