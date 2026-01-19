import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UtensilsCrossed } from "lucide-react";
import { useUserMenu, MenuItem } from "@/hooks/useMenu";

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
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              No disponible
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
      {item.price !== null && (
        <span className="text-foreground font-semibold whitespace-nowrap">
          ${item.price.toFixed(2)}
        </span>
      )}
    </div>
  );
};

export const MenuSheet = ({
  open,
  onOpenChange,
  userId,
  businessName,
}: MenuSheetProps) => {
  const { data: menu, isLoading } = useUserMenu(userId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-left">
                {menu?.name || "Menú"}
              </SheetTitle>
              {businessName && (
                <p className="text-sm text-muted-foreground">{businessName}</p>
              )}
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
              <p className="text-muted-foreground">
                Este negocio aún no ha agregado items a su menú
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {menu.items
                .filter((item) => item.is_available)
                .map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
