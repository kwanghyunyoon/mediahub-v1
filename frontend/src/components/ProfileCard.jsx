import { motion } from "framer-motion";
import { getIcon, hexToRgb } from "@/lib/registry";

export default function ProfileCard({ profile, onClick, index = 0, isSelected = false }) {
  const Icon = getIcon(profile.icon);
  const rgb = hexToRgb(profile.color);

  return (
    <motion.button
      type="button"
      data-testid={`profile-card-${profile.id}`}
      onClick={() => onClick(profile)}
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{
        opacity: 1,
        y: isSelected ? -8 : 0,
        scale: isSelected ? 1.1 : 1,
      }}
      transition={
        isSelected
          ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }
      }
      whileHover={!isSelected ? { scale: 1.05, y: -4 } : undefined}
      whileTap={!isSelected ? { scale: 0.97 } : undefined}
      style={{
        "--p-color": profile.color,
        "--p-rgb": rgb,
        boxShadow: isSelected
          ? `0 0 60px -6px rgba(${rgb}, 0.75), 0 0 120px -20px rgba(${rgb}, 0.35)`
          : undefined,
        backgroundColor: isSelected ? "var(--mh-card-hover)" : "var(--mh-card)",
        borderColor: isSelected ? profile.color : "var(--mh-border)",
      }}
      className={`group relative flex flex-col items-center justify-center p-6 md:p-8
                 rounded-3xl border
                 w-36 h-36 md:w-44 md:h-44 lg:w-48 lg:h-48
                 transition-[background-color,border-color,box-shadow] duration-300 ease-out
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-color)]
                 ${!isSelected ? "hover:border-[var(--p-color)] hover:shadow-[0_0_50px_-10px_rgba(var(--p-rgb),0.55)]" : ""}`}
    >
      {/* hover bg via CSS var */}
      {!isSelected && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: "var(--mh-card-hover)" }}
        />
      )}

      <div
        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3
                   border transition-colors duration-300
                   ${isSelected
                     ? "border-transparent"
                     : "group-hover:border-transparent"
                   }`}
        style={{
          backgroundColor: isSelected ? profile.color : undefined,
          borderColor: isSelected ? "transparent" : "var(--mh-border)",
        }}
      >
        {/* icon bg fill on hover (non-selected) */}
        {!isSelected && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ backgroundColor: profile.color }}
          />
        )}
        <Icon
          className={`relative w-7 h-7 md:w-8 md:h-8 transition-colors duration-300
                     ${isSelected ? "text-white" : "text-white/60 group-hover:text-white"}`}
          strokeWidth={1.5}
        />
      </div>

      <span
        data-testid={`profile-name-${profile.id}`}
        className={`relative text-sm md:text-base font-medium transition-colors duration-300 truncate max-w-full
                   ${isSelected ? "text-white" : "text-white/80 group-hover:text-white"}`}
      >
        {profile.name}
      </span>
    </motion.button>
  );
}
