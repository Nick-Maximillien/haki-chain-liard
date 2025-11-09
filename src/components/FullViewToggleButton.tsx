import { motion } from "framer-motion"
import { Maximize2, Minimize2 } from "lucide-react"

interface FullViewToggleButtonProps {
  isFullView: boolean
  onToggle: () => void
  className?: string
  variant?: "solid" | "ghost"
  hideLabelOnSmallScreens?: boolean
}

export function FullViewToggleButton({
  isFullView,
  onToggle,
  className,
  variant = "solid",
  hideLabelOnSmallScreens = false,
}: FullViewToggleButtonProps) {
  const label = isFullView ? "Collapse View" : "Expand View"

  const baseClasses =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2"

  const variantClasses =
    variant === "solid"
      ? "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-teal-500 hover:text-teal-600 focus:ring-teal-500"
      : "bg-transparent text-white/80 hover:text-white focus:ring-white/60"

  const labelClasses = hideLabelOnSmallScreens ? "ml-2 hidden md:inline" : "ml-2"

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`${baseClasses} ${variantClasses} ${className || ""}`.trim()}
    >
      {isFullView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      <span className={labelClasses}>{label}</span>
    </motion.button>
  )
}
