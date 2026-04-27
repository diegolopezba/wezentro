import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import defaultAvatarImage from "@/assets/default-avatar.png";
import { getOptimizedImageUrl, isSupabaseStorageUrl } from "@/lib/imageOptimization";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
  /**
   * Render width in CSS px used to request an optimized variant from Supabase Storage.
   * Defaults to 80 (covers most avatar slots up to ~40px @ 2× DPR).
   * Pass 40 for tiny avatars (notification rows, comment bubbles)
   * or 160+ for profile headers.
   */
  size?: number;
};

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, size = 80, ...props }, ref) => {
  // Rewrite Supabase Storage URLs to a width-capped, quality-compressed variant.
  // Non-storage URLs (lovable-uploads, externals) pass through unchanged.
  const optimizedSrc =
    typeof src === "string" && isSupabaseStorageUrl(src)
      ? getOptimizedImageUrl(src, size)
      : src;

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={optimizedSrc}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  >
    {children || (
      <img
        src={defaultAvatarImage}
        alt="Default avatar"
        className="h-full w-full object-cover rounded-full"
      />
    )}
  </AvatarPrimitive.Fallback>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };

