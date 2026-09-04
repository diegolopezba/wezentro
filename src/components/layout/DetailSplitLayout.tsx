import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Media column: cover image, carousel or picker. */
  media: ReactNode;
  /** Content column: title, details, form fields, actions. */
  content: ReactNode;
  /** Optional full-width block rendered under both columns (e.g. related items). */
  below?: ReactNode;
  className?: string;
}

/**
 * Pinterest-style layout primitive.
 * Mobile: plain vertical stack (media first) — identical to the previous markup.
 * Desktop (lg+): media on the left (sticky), content on the right, `below`
 * spanning the full width underneath.
 */
export const DetailSplitLayout = ({ media, content, below, className }: Props) => (
  <div className={className}>
    <div className="lg:flex lg:items-start">
      <div className="lg:w-[55%] lg:shrink-0 lg:sticky lg:top-0 lg:self-start">{media}</div>
      <div className={cn("lg:w-[45%] lg:min-w-0")}>{content}</div>
    </div>
    {below}
  </div>
);
