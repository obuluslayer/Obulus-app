// Brand asset supplied by the client. Import it through Vite so the production build fingerprints the file correctly.
import logoImage from "@/imports/logo_2.png";
import { ImageWithFallback } from "../figma/ImageWithFallback";

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkSize?: number;
};

type MarkProps = {
  size?: number;
  color?: string;
};

/** The supplied Obulus Layer brand mark. */
export function ObulusMark({ size = 28 }: MarkProps) {
  return (
    <ImageWithFallback
      src={logoImage}
      alt=""
      aria-hidden="true"
      className="block shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function ObulusLogo({
  size = 28,
  showWordmark = true,
  className = "",
  wordmarkSize,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <ImageWithFallback
        src={logoImage}
        alt="Obulus Layer logo"
        className="block shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span
          className="text-obulus-ink tracking-tight"
          style={{ fontWeight: 700, fontSize: wordmarkSize ?? size * 0.72 }}
        >
          Obulus
        </span>
      )}
    </div>
  );
}

// Subtle repeating background pattern using the Obulus mark in lime.
export function ObulusPattern({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #CDFF00 0 3px, transparent 3px), radial-gradient(circle at center, transparent 0 10px, #CDFF00 10px 11px, transparent 11px)",
          backgroundSize: "44px 44px",
          backgroundPosition: "0 0",
        }}
      />
    </div>
  );
}
