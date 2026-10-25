import { CarFront } from "lucide-react";
type Props = { size?: number; showText?: boolean; className?: string };

export function Logo({ size = 36, showText = true, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CarFront size={size} className="shrink-0 text-primary" strokeWidth={1.7} aria-hidden="true" />
      {showText && (
        <div className="leading-none">
          <div className="font-display text-2xl tracking-wide">
            <span className="text-primary">ORÇA </span>
            <span className="text-foreground">FUNILARIA</span>
          </div>
          <div className="font-display text-[10px] tracking-[0.35em] text-muted-foreground -mt-0.5">
            PRO
          </div>
        </div>
      )}
    </div>
  );
}
