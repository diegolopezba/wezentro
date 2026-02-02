import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMyMenu,
  useCreateMenu,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useReorderMenuItems,
  MenuItem,
} from "@/hooks/useMenu";

interface EditMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemFormData {
  name: string;
  description: string;
  price: string;
}

const MenuItemRow = ({
  item,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const updateMutation = useUpdateMenuItem();

  const handleAvailabilityChange = (checked: boolean) => {
    updateMutation.mutate({ id: item.id, is_available: checked });
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground truncate">{item.name}</h4>
          {item.price !== null && (
            <span className="text-sm text-muted-foreground">
              ${item.price.toFixed(2)}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={item.is_available}
          onCheckedChange={handleAvailabilityChange}
          disabled={updateMutation.isPending}
        />
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export const EditMenuSheet = ({ open, onOpenChange }: EditMenuSheetProps) => {
  const { data: menu, isLoading } = useMyMenu();
  const createMenuMutation = useCreateMenu();
  const createItemMutation = useCreateMenuItem();
  const updateItemMutation = useUpdateMenuItem();
  const deleteItemMutation = useDeleteMenuItem();
  const reorderMutation = useReorderMenuItems();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>({
    name: "",
    description: "",
    price: "",
  });

  const handleCreateMenu = async () => {
    try {
      await createMenuMutation.mutateAsync("Menú");
      toast.success("¡Menú creado!");
    } catch {
      toast.error("Error al crear menú");
    }
  };

  const handleOpenItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || "",
        price: item.price?.toString() || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", description: "", price: "" });
    }
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const price = itemForm.price ? parseFloat(itemForm.price) : undefined;

    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({
          id: editingItem.id,
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || null,
          price: price ?? null,
        });
        toast.success("Item actualizado");
      } else {
        if (!menu) return;
        await createItemMutation.mutateAsync({
          menuId: menu.id,
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || undefined,
          price,
        });
        toast.success("Item agregado");
      }
      setIsItemDialogOpen(false);
    } catch {
      toast.error("Error al guardar item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItemMutation.mutateAsync(id);
      toast.success("Item eliminado");
    } catch {
      toast.error("Error al eliminar item");
    }
  };

  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    if (!menu) return;

    const items = [...menu.items];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= items.length) return;

    // Swap items
    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    // Update display_order for all items
    const updates = items.map((item, i) => ({
      id: item.id,
      display_order: i,
    }));

    try {
      await reorderMutation.mutateAsync(updates);
    } catch {
      toast.error("Error al reordenar items");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <SheetTitle>Editar Menú</SheetTitle>
              </div>
              {menu && (
                <Button
                  size="sm"
                  onClick={() => handleOpenItemDialog()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(85vh-120px)]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-12 w-8" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : !menu ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aún no tienes un menú
                </p>
                <Button
                  onClick={handleCreateMenu}
                  disabled={createMenuMutation.isPending}
                  className="gap-2"
                >
                  {createMenuMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Crear Menú
                </Button>
              </div>
            ) : menu.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Tu menú está vacío
                </p>
                <Button onClick={() => handleOpenItemDialog()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar primer item
                </Button>
              </div>
            ) : (
              <div>
                {menu.items.map((item, index) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => handleOpenItemDialog(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onMoveUp={() => handleMoveItem(index, "up")}
                    onMoveDown={() => handleMoveItem(index, "down")}
                    isFirst={index === 0}
                    isLast={index === menu.items.length - 1}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Item" : "Agregar Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nombre *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Hamburguesa clásica"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Descripción</Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descripción del item..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-price">Precio</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {(createItemMutation.isPending || updateItemMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {editingItem ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
