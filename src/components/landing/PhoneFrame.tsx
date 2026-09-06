import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/LandingShell";

/**
 * Device frame for real app screenshots. Image-first landing (dice.fm style):
 * one big screen per idea, almost no text around it.
 */
export const PhoneFrame = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <div
    className={cn(
      "mx-auto w-full max-w-[280px] rounded-[42px] border border-border bg-card p-2 shadow-2xl",
      className,
    )}
  >
    <div className="overflow-hidden rounded-[34px] bg-background">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  </div>
);

/** One headline + one line + one big screen, alternating sides. */
export const MediaSplit = ({
  title,
  line,
  src,
  alt,
  reverse,
  children,
}: {
  title: string;
  line: string;
  src: string;
  alt: string;
  reverse?: boolean;
  children?: ReactNode;
}) => (
  <div className="grid items-center gap-10 lg:grid-cols-2">
    <Reveal className={cn(reverse && "lg:order-2")}>
      <h2 className="font-brand text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
        {line}
      </p>
      {children}
    </Reveal>
    <Reveal delay={100} className={cn(reverse && "lg:order-1")}>
      <PhoneFrame src={src} alt={alt} />
    </Reveal>
  </div>
);

/** Compact row of short labels — replaces long feature paragraphs. */
export const LabelStrip = ({ items }: { items: string[] }) => (
  <div className="mt-7 flex flex-wrap gap-2">
    {items.map((item) => (
      <span
        key={item}
        className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium"
      >
        {item}
      </span>
    ))}
  </div>
);

/** Two or three screens side by side, for a quick visual summary. */
export const ScreenStrip = ({
  shots,
}: {
  shots: { src: string; alt: string }[];
}) => (
  <div className="grid gap-6 sm:grid-cols-3">
    {shots.map((s, i) => (
      <Reveal key={s.src} delay={i * 80}>
        <PhoneFrame src={s.src} alt={s.alt} className="max-w-[240px]" />
      </Reveal>
    ))}
  </div>
);
