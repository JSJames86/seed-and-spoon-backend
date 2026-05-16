interface LogoProps {
  variant?: "full" | "icon" | "light"
  className?: string
  size?: "sm" | "md" | "lg"
}

export function SeedSpoonLogo({ variant = "full", className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: "text-base", gap: "gap-1" },
    md: { icon: 44, text: "text-xl",   gap: "gap-1.5" },
    lg: { icon: 60, text: "text-3xl",  gap: "gap-2" },
  }

  const s = sizes[size]
  const isLight = variant === "light"

  const green  = isLight ? "#ffffff"           : "#6B8E3B"
  const orange = isLight ? "rgba(255,255,255,0.80)" : "#C96428"

  // Spoon icon: viewBox 0 0 40 62
  // Bowl: ellipse centred at (20, 28), rx 11 ry 13
  // Handle: flows down from bowl, small teardrop loop at bottom
  // Arcs: two orange concentric arcs curving above the bowl
  // Leaves: two teardrop leaf shapes inside the bowl, sprouting upward
  const iconSvg = (
    <svg
      width={s.icon}
      height={Math.round(s.icon * 1.55)}
      viewBox="0 0 40 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Spoon handle — curves down from bowl bottom */}
      <path
        d="M20 41 C20 47 18 52 20 57 C21 60 22 61 20 61 C18 61 17 60 18 57 C20 52 20 47 20 41Z"
        stroke={green}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Spoon bowl */}
      <ellipse cx="20" cy="28" rx="11" ry="13" stroke={green} strokeWidth="1.8" fill="none" />

      {/* Orange arcs above bowl — inner */}
      <path
        d="M13 19 Q20 13 27 19"
        stroke={orange}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Orange arcs above bowl — outer */}
      <path
        d="M10 14 Q20 7  30 14"
        stroke={orange}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left leaf */}
      <path
        d="M20 27 Q16 21 18 16 Q20 21 20 27Z"
        fill={green}
      />
      {/* Right leaf */}
      <path
        d="M20 27 Q24 21 22 16 Q20 21 20 27Z"
        fill={green}
      />
    </svg>
  )

  if (variant === "icon") {
    return <div className={className}>{iconSvg}</div>
  }

  // Full logo: "Seed" [icon] "Spoon" — matching the actual logo layout
  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <span
        className={`${s.text} font-bold tracking-tight`}
        style={{ color: isLight ? "#ffffff" : "#6B8E3B", fontFamily: "Georgia, serif" }}
      >
        Seed
      </span>

      {iconSvg}

      <span
        className={`${s.text} font-bold tracking-tight`}
        style={{ color: isLight ? "rgba(255,255,255,0.85)" : "#C96428", fontFamily: "Georgia, serif" }}
      >
        Spoon
      </span>
    </div>
  )
}
