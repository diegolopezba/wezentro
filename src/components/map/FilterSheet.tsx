import { useState } from "react";
import { X, Calendar, MapPin, Users, RotateCcw, UserCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FilterOptions } from "@/hooks/useNearbyEvents";
import { useAuth } from "@/contexts/AuthContext";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
}

const DATE_OPTIONS = [
  { value: "all", label: "All Dates" },
  { value: "tonight", label: "Tonight" },
  { value: "this_weekend", label: "This Weekend" },
] as const;

const CATEGORIES = [
  { value: "club", label: "Club", color: "from-purple-500 to-pink-500" },
  { value: "bar", label: "Bar", color: "from-amber-500 to-orange-500" },
  { value: "concert", label: "Concert", color: "from-blue-500 to-cyan-500" },
  { value: "festival", label: "Festival", color: "from-green-500 to-emerald-500" },
  { value: "house_party", label: "House Party", color: "from-red-500 to-rose-500" },
  { value: "lounge", label: "Lounge", color: "from-indigo-500 to-violet-500" },
];

const DISTANCE_OPTIONS = [
  { value: null, label: "Any distance" },
  { value: 1, label: "1 mile" },
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
];

export const FilterSheet = ({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
}: FilterSheetProps) => {
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

  const toggleCategory = (category: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const { user } = useAuth();

  const activeFilterCount = 
    (localFilters.dateFilter !== "all" ? 1 : 0) +
    localFilters.categories.length +
    (localFilters.maxDistance !== null ? 1 : 0) +
    (localFilters.hasGuestlistOnly ? 1 : 0) +
    (localFilters.friendsGoingOnly ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-brand text-xl">Filters</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-24">
          {/* Date Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Date</span>
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

          {/* Category Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <span className="font-medium">Category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.value}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCategory(category.value)}
                  className={cn(
                    "rounded-full transition-all",
                    localFilters.categories.includes(category.value) &&
                      `bg-gradient-to-r ${category.color} text-white border-transparent`
                  )}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Distance Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">Distance</span>
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
                <Label className="font-medium">Has Guestlist</Label>
                <p className="text-xs text-muted-foreground">
                  Only show events with guestlists
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
                  <Label className="font-medium">Friends Going</Label>
                  <p className="text-xs text-muted-foreground">
                    Only show events friends are attending
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
            Apply Filters
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
