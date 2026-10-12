import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UtensilsCrossed } from "lucide-react";
import { useUserMenu, MenuItem, MenuCategory } from "@/hooks/useMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TierKey, tierHasFeature } from "@/lib/subscriptionTiers";

interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  businessName?: string | null;
}

const MenuItemCard = ({ item, showImages }: { item: MenuItem; showImages: boolean }) => {
  return (
    <div className="flex justify-between items-start gap-3 py-3 border-b border-border last:border-b-0">
      {showImages && item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className="w-[72px] h-[72px] rounded-xl object-cover shrink-0"
        />
      )}
      <div className="flex-1 pr-4 min-w-0">
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

const CategorySection = ({ category, items, showImages }: { category: MenuCategory | null; items: MenuItem[]; showImages: boolean }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      {category && (
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2 px-1">{category.name}</h3>
      )}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} showImages={showImages} />
        ))}
      </div>
    </div>
  );
};

export const MenuSheet = ({ open, onOpenChange, userId, businessName }: MenuSheetProps) => {
  const { data: menu, isLoading } = useUserMenu(userId);
  // Public tier lookup: business_subscriptions is owner-only under RLS, so
  // visitors resolve the plan through a security-definer function.
  const { data: publicTier } = useQuery({
    queryKey: ["business-public-tier", userId],
    enabled: !!userId && open,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_business_public_tier", {
        _business_id: userId,
      });
      if (error) throw error;
      return (data as TierKey | null) ?? "basico";
    },
  });
  const showImages = tierHasFeature((publicTier ?? "basico") as TierKey, "menu_images");

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
  const [selected, setSelected] = useState<string>("all");
  useEffect(() => {
    if (open) setSelected("all");
  }, [open, userId]);
  const pills = [
    ...categorized.filter((c) => c.items.length > 0).map((c) => ({ id: c.category.id, name: c.category.name, count: c.items.length })),
    ...(uncategorized.length > 0 ? [{ id: "none", name: "Otros", count: uncategorized.length }] : []),
  ];
  const total = pills.reduce((s, p) => s + p.count, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet h-[80vh] rounded-t-3xl">
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
              {pills.length > 1 && (
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-3 -mx-1 px-1">
                  {[{ id: "all", name: "Todos", count: total }, ...pills].map((p) => {
                    const active = selected === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelected(p.id)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors active:scale-95 ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card text-foreground border-border"
                        }`}
                      >
                        {p.name} <span className="opacity-60">({p.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {categorized
                .filter(({ category }) => selected === "all" || selected === category.id)
                .map(({ category, items }) => (
                  <CategorySection key={category.id} category={category} items={items} showImages={showImages} />
                ))}
              {uncategorized.length > 0 && (selected === "all" || selected === "none") && (
                <CategorySection
                  category={selected === "none" ? null : pills.length > 1 ? ({ id: "none", name: "Otros" } as MenuCategory) : null}
                  items={uncategorized}
                  showImages={showImages}
                />
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
