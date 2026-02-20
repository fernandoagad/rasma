import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

interface AvatarInitialsProps {
  name: string;
  size?: keyof typeof sizes;
  image?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AvatarInitials({ name, size = "md", image, className }: AvatarInitialsProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-rasma-lime/30 text-rasma-dark font-semibold flex items-center justify-center shrink-0",
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
