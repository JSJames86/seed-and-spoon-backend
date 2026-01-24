interface LogoProps {
  variant?: "full" | "icon" | "light"
  className?: string
  size?: "sm" | "md" | "lg"
}

export function SeedSpoonLogo({ variant = "full", className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: 28, text: "text-sm", gap: "gap-1.5" },
    md: { icon: 36, text: "text-lg", gap: "gap-2" },
    lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
  }

  const s = sizes[size]
  const isLight = variant === "light"

  const iconSvg = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Spoon handle */}
      <path
        d="M24 48V28"
        stroke={isLight ? "#ffffff" : "#6B8E3B"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Spoon bowl */}
      <ellipse
        cx="24"
        cy="22"
        rx="8"
        ry="9"
        stroke={isLight ? "#ffffff" : "#6B8E3B"}
        strokeWidth="2"
        fill="none"
      />
      {/* Orange arc decorations */}
      <path
        d="M18 12C20 8 28 8 30 12"
        stroke={isLight ? "rgba(255,255,255,0.7)" : "#E86A1D"}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 9C19 4 29 4 32 9"
        stroke={isLight ? "rgba(255,255,255,0.5)" : "#E86A1D"}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaves */}
      <path
        d="M24 14C24 14 20 8 22 4C24 8 24 14 24 14Z"
        fill={isLight ? "#ffffff" : "#6B8E3B"}
      />
      <path
        d="M24 14C24 14 28 8 26 4C24 8 24 14 24 14Z"
        fill={isLight ? "#ffffff" : "#6B8E3B"}
      />
    </svg>
  )

  if (variant === "icon") {
    return <div className={className}>{iconSvg}</div>
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {iconSvg}
      <div className={`${s.text} font-bold leading-tight flex items-baseline gap-0.5`}>
        <span className={isLight ? "text-white" : "text-[#6B8E3B]"}>Seed</span>
        <span className={isLight ? "text-white/80" : "text-[#E86A1D]"}>Spoon</span>
      </div>
    </div>
  )
}
