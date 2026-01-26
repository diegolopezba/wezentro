import { useState } from "react";
import { Calendar, MapPin, Users, RotateCcw, UserCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FilterOptions } from "@/hooks/useNearbyEvents";
import { useAuth } from "@/contexts/AuthContext";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
}

const DATE_OPTIONS = [
  { value: "all", label: "Todas las fechas" },
  { value: "tonight", label: "Esta noche" },
  { value: "this_weekend", label: "Este fin de semana" },
] as const;

const DISTANCE_OPTIONS = [
  { value: null, label: "Cualquier distancia" },
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
];

export const FilterSheet = ({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
}: FilterSheetProps) => {
  const { user } = useAuth();
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      searchQuery: filters.searchQuery,
      dateFilter: "all",
      categories: [],
      maxDistance: null,
      hasGuestlistOnly: false,
      friendsGoingOnly: false,
    };
    setLocalFilters(resetFilters);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const activeFilterCount = 
    (localFilters.dateFilter !== "all" ? 1 : 0) +
    (localFilters.maxDistance !== null ? 1 : 0) +
    (localFilters.hasGuestlistOnly ? 1 : 0) +
    (localFilters.friendsGoingOnly ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-brand text-xl">Filtros</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reiniciar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-24 overscroll-contain">
          {/* Date Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Fecha</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={localFilters.dateFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      dateFilter: option.value,
                    }))
                  }
                  className="rounded-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Distance Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">Distancia</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((option) => (
                <Button
                  key={option.value ?? "any"}
                  variant={localFilters.maxDistance === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      maxDistance: option.value,
                    }))
                  }
                  className="rounded-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Guestlist Filter */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <Label className="font-medium">Con lista de invitados</Label>
                <p className="text-xs text-muted-foreground">
                  Solo mostrar eventos con lista de invitados
                </p>
              </div>
            </div>
            <Switch
              checked={localFilters.hasGuestlistOnly}
              onCheckedChange={(checked) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  hasGuestlistOnly: checked,
                }))
              }
            />
          </div>

          {/* Friends Going Filter */}
          {user && (
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-primary" />
                <div>
                  <Label className="font-medium">Amigos asistiendo</Label>
                  <p className="text-xs text-muted-foreground">
                    Solo mostrar eventos donde asisten amigos
                  </p>
                </div>
              </div>
              <Switch
                checked={localFilters.friendsGoingOnly}
                onCheckedChange={(checked) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    friendsGoingOnly: checked,
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button
            className="w-full rounded-full h-12"
            onClick={handleApply}
          >
            Aplicar filtros
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
