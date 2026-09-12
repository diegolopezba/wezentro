import { m } from "framer-motion";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Todos" },
  { id: "party", label: "Fiestas" },
  { id: "bar", label: "Bares" },
  { id: "concert", label: "Conciertos" },
  { id: "festival", label: "Festivales" },
  { id: "rooftop", label: "Rooftops" },
  { id: "restaurant", label: "Restaurantes" },
  { id: "coffee", label: "Café" },
  { id: "fitness", label: "Fitness" },
  { id: "culture", label: "Arte y Cultura" },
  { id: "adventure", label: "Aventura" },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  return (
    <div className="flex gap-5 px-4 py-3 overflow-x-auto no-scrollbar border-b border-border">
      {categories.map((category) => {
        const isSelected = selected === category.id;

        return (
          <m.button
            key={category.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(category.id)}
            className="relative flex flex-col items-center whitespace-nowrap pb-3"
          >
            <span
              className={cn(
                "text-sm transition-colors",
                isSelected ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              {category.label}
            </span>
            {isSelected && (
              <m.span
                layoutId="category-filter-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-foreground"
              />
            )}
          </m.button>
        );
      })}
    </div>
  );
};
