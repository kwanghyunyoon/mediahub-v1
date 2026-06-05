import { motion } from "framer-motion";
import { getIcon, hexToRgb } from "@/lib/registry";

export default function ProfileCard({ profile, onClick, index = 0 }) {
  const Icon = getIcon(profile.icon);
  const rgb = hexToRgb(profile.color);

  return (
    <motion.button
      type="button"
      data-testid={`profile-card-${profile.id}`}
      onClick={() => onClick(profile)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        "--p-color": profile.color,
        "--p-rgb": rgb,
      }}
      className="group relative flex flex-col items-center justify-center p-6 md:p-8
                 rounded-3xl bg-[#101015] border border-white/[0.06]
                 w-36 h-36 md:w-44 md:h-44 lg:w-48 lg:h-48
                 transition-[background-color,border-color,box-shadow] duration-500 ease-out
                 hover:bg-[#16161c]
                 hover:border-[var(--p-color)]
                 hover:shadow-[0_0_50px_-10px_rgba(var(--p-rgb),0.55)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-color)]"
    >
      <div
        className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3
                   bg-white/[0.04] border border-white/[0.06]
                   transition-colors duration-500
                   group-hover:bg-[var(--p-color)] group-hover:border-transparent"
      >
        <Icon
          className="w-7 h-7 md:w-8 md:h-8 text-white/60 transition-colors duration-500 group-hover:text-white"
          strokeWidth={1.5}
        />
      </div>
      <span
        data-testid={`profile-name-${profile.id}`}
        className="text-sm md:text-base font-medium text-white/80 group-hover:text-white transition-colors duration-500 truncate max-w-full"
      >
        {profile.name}
      </span>
    </motion.button>
  );
}
