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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FolderPlus,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMyMenu,
  useCreateMenu,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useReorderMenuItems,
  useCreateMenuCategory,
  useUpdateMenuCategory,
  useDeleteMenuCategory,
  useReorderMenuCategories,
  MenuItem,
  MenuCategory,
} from "@/hooks/useMenu";

interface EditMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
}

interface CategoryFormData {
  name: string;
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
              Bs. {item.price.toFixed(2)}
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

const CategoryRow = ({
  category,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  category: MenuCategory;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-secondary/30 rounded-lg mb-2">
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>

      <Folder className="w-4 h-4 text-primary" />
      <span className="flex-1 font-medium text-sm">{category.name}</span>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
        <Pencil className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
        <Trash2 className="w-3 h-3 text-destructive" />
      </Button>
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
  const createCategoryMutation = useCreateMenuCategory();
  const updateCategoryMutation = useUpdateMenuCategory();
  const deleteCategoryMutation = useDeleteMenuCategory();
  const reorderCategoriesMutation = useReorderMenuCategories();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>({
    name: "",
    description: "",
    price: "",
    categoryId: "",
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
  });
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

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
        categoryId: item.category_id || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", description: "", price: "", categoryId: "" });
    }
    setIsItemDialogOpen(true);
  };

  const handleOpenCategoryDialog = (category?: MenuCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "" });
    }
    setIsCategoryDialogOpen(true);
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
          category_id: itemForm.categoryId || null,
        });
        toast.success("Item actualizado");
      } else {
        if (!menu) return;
        await createItemMutation.mutateAsync({
          menuId: menu.id,
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || undefined,
          price,
          categoryId: itemForm.categoryId || undefined,
        });
        toast.success("Item agregado");
      }
      setIsItemDialogOpen(false);
    } catch {
      toast.error("Error al guardar item");
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          name: categoryForm.name.trim(),
        });
        toast.success("Categoría actualizada");
      } else {
        if (!menu) return;
        await createCategoryMutation.mutateAsync({
          menuId: menu.id,
          name: categoryForm.name.trim(),
        });
        toast.success("Categoría agregada");
      }
      setIsCategoryDialogOpen(false);
    } catch {
      toast.error("Error al guardar categoría");
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

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      toast.success("Categoría eliminada");
    } catch {
      toast.error("Error al eliminar categoría");
    }
  };

  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    if (!menu) return;

    const items = [...menu.items];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= items.length) return;

    [items[index], items[newIndex]] = [items[newIndex], items[index]];

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

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    if (!menu) return;

    const categories = [...(menu.categories || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= categories.length) return;

    [categories[index], categories[newIndex]] = [categories[newIndex], categories[index]];

    const updates = categories.map((cat, i) => ({
      id: cat.id,
      display_order: i,
    }));

    try {
      await reorderCategoriesMutation.mutateAsync(updates);
    } catch {
      toast.error("Error al reordenar categorías");
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCategoryDialog()}
                    className="gap-1"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Categoría
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenItemDialog()}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Item
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Tabs */}
          {menu && (
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={activeTab === "items" ? "default" : "outline"}
                onClick={() => setActiveTab("items")}
                className="flex-1"
              >
                Items ({menu.items.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "categories" ? "default" : "outline"}
                onClick={() => setActiveTab("categories")}
                className="flex-1"
              >
                Categorías ({menu.categories?.length || 0})
              </Button>
            </div>
          )}

          <ScrollArea className="h-[calc(85vh-180px)]">
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
            ) : activeTab === "categories" ? (
              // Categories Tab
              menu.categories?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Sin categorías aún
                  </p>
                  <Button onClick={() => handleOpenCategoryDialog()} className="gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Agregar categoría
                  </Button>
                </div>
              ) : (
                <div>
                  {menu.categories?.map((category, index) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() => handleOpenCategoryDialog(category)}
                      onDelete={() => handleDeleteCategory(category.id)}
                      onMoveUp={() => handleMoveCategory(index, "up")}
                      onMoveDown={() => handleMoveCategory(index, "down")}
                      isFirst={index === 0}
                      isLast={index === (menu.categories?.length || 1) - 1}
                    />
                  ))}
                </div>
              )
            ) : // Items Tab
            menu.items.length === 0 ? (
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
              <Label htmlFor="item-price">Precio (Bs.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Bs.
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
                  className="pl-10"
                />
              </div>
            </div>

            {menu && menu.categories && menu.categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="item-category">Categoría</Label>
                <Select
                  value={itemForm.categoryId}
                  onValueChange={(value) =>
                    setItemForm((prev) => ({ ...prev, categoryId: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {menu.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Add/Edit Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Agregar Categoría"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ name: e.target.value })
                }
                placeholder="Ej: Bebidas, Entradas, Platos principales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {editingCategory ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
