import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UtensilsCrossed } from "lucide-react";
import { useUserMenu, MenuItem, MenuCategory } from "@/hooks/useMenu";

interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  businessName?: string | null;
}

const MenuItemCard = ({ item }: { item: MenuItem }) => {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">{item.name}</h4>
          {!item.is_available && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">No disponible</span>
          )}
        </div>
        {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
      </div>
      {item.price !== null && (
        <span className="text-foreground font-semibold whitespace-nowrap">Bs. {item.price.toFixed(2)}</span>
      )}
    </div>
  );
};

const CategorySection = ({ category, items }: { category: MenuCategory | null; items: MenuItem[] }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      {category && (
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2 px-1">{category.name}</h3>
      )}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export const MenuSheet = ({ open, onOpenChange, userId, businessName }: MenuSheetProps) => {
  const { data: menu, isLoading } = useUserMenu(userId);

  // Group items by category
  const getGroupedItems = (): {
    uncategorized: MenuItem[];
    categorized: { category: MenuCategory; items: MenuItem[] }[];
  } => {
    if (!menu) return { uncategorized: [], categorized: [] };

    const availableItems = menu.items.filter((item) => item.is_available);
    const categories = menu.categories || [];

    // Items without category
    const uncategorized = availableItems.filter((item) => !item.category_id);

    // Items grouped by category
    const categorized = categories.map((cat) => ({
      category: cat,
      items: availableItems.filter((item) => item.category_id === cat.id),
    }));

    return { uncategorized, categorized };
  };

  const { uncategorized, categorized } = getGroupedItems();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-left">{menu?.name || "Menú"}</SheetTitle>
              {businessName && <p className="text-sm text-muted-foreground">{businessName}</p>}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between py-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : !menu || menu.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Este negocio aún no ha agregado items a su menú</p>
            </div>
          ) : (
            <div>
              {/* Categorized items */}
              {categorized.map(({ category, items }) => (
                <CategorySection key={category.id} category={category} items={items} />
              ))}
              {/* Uncategorized items */}
              {uncategorized.length > 0 && <CategorySection category={null} items={uncategorized} />}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
