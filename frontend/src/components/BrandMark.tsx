import soloLogo from "../assets/solo-logo.png";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
}

export default function BrandMark({
  className,
  iconClassName = "h-10 sm:h-11",
  wordmarkClassName,
  taglineClassName,
  showTagline = true,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src={soloLogo} alt="" className={cn("w-auto shrink-0 object-contain", iconClassName)} />
      <div className="flex flex-col leading-tight">
        {showTagline && (
          <span className={cn("text-[11px] font-medium text-slate-500 sm:text-xs", taglineClassName)}>
            Inspiring Passion and Grit
          </span>
        )}
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight text-brand-blue sm:text-xl",
            wordmarkClassName
          )}
        >
          InspiringPG
        </span>
      </div>
    </div>
  );
}
