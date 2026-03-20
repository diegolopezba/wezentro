import { FoodLocation } from "@/hooks/useFoodLocations";
import defaultAvatar from "@/assets/default-avatar.png";

interface FoodMarkerProps {
  location: FoodLocation;
  onClick: () => void;
}

export const FoodMarker = ({ location, onClick }: FoodMarkerProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center focus:outline-none"
    >
      {/* Avatar container */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border shadow-lg group-hover:scale-110 transition-transform">
        <img
          src={location.avatar_url || defaultAvatar}
          alt={location.full_name || location.username}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = defaultAvatar;
          }}
        />
      </div>
      
      {/* Food badge */}
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-red flex items-center justify-center border-2 border-background">
        <span className="text-[10px]">🍽️</span>
      </div>
    </button>
  );
};

// Component to render as marker popup
export const FoodMarkerPopup = ({
  location,
  onViewProfile,
}: {
  location: FoodLocation;
  onViewProfile: () => void;
}) => {
  return (
    <button
      onClick={onViewProfile}
      className="bg-background rounded-xl p-3 shadow-xl border border-border min-w-[200px] text-left hover:bg-secondary/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <img
          src={location.avatar_url || defaultAvatar}
          alt={location.full_name || location.username}
          className="w-12 h-12 rounded-full object-cover border-2 border-border"
          onError={(e) => {
            e.currentTarget.src = defaultAvatar;
          }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">
            {location.full_name || `@${location.username}`}
          </h4>
          {location.full_name && (
            <p className="text-sm text-muted-foreground truncate">
              @{location.username}
            </p>
          )}
        </div>
      </div>
      
      {location.bio && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {location.bio}
        </p>
      )}
    </button>
  );
};
