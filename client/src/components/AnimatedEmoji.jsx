import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Rive from "@rive-app/react-canvas";

// Preset animations for standard emojis
const EMOJI_ANIMATIONS = {
  "🔥": {
    animate: {
      scale: [1, 1.15, 1.05, 1.2, 1],
      rotate: [-3, 3, -2, 4, 0],
      y: [0, -2, 0, -3, 0],
    },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.6))",
  },
  "❤️": {
    animate: {
      scale: [1, 1.22, 1.08, 1.28, 1],
    },
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 10px rgba(244, 63, 94, 0.6))",
  },
  "😍": {
    animate: {
      scale: [1, 1.12, 1],
      rotate: [-2, 2, -2],
      y: [0, -2, 0],
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))",
  },
  "😂": {
    animate: {
      rotate: [-8, 8, -6, 6, 0],
      y: [0, -3, 1, -2, 0],
    },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))",
  },
  "👋": {
    animate: {
      rotate: [0, 24, -10, 24, -6, 16, 0],
    },
    transition: { duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))",
  },
  "⚡": {
    animate: {
      scale: [1, 1.2, 0.95, 1.15, 1],
      opacity: [1, 0.85, 1, 0.9, 1],
    },
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(234, 179, 8, 0.7))",
  },
  "🛡️": {
    animate: {
      y: [0, -2, 0],
      scale: [1, 1.05, 1],
    },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))",
  },
  "✅": {
    animate: {
      scale: [1, 1.1, 1],
    },
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))",
  },
  "✨": {
    animate: {
      rotate: [0, 15, -15, 0],
      scale: [1, 1.18, 0.95, 1],
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.7))",
  },
  "🤖": {
    animate: {
      y: [0, -3, 0],
      rotate: [-3, 3, 0],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(79, 70, 229, 0.5))",
  },
  "🎯": {
    animate: {
      scale: [1, 1.1, 1],
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))",
  },
  "💡": {
    animate: {
      scale: [1, 1.15, 1],
      opacity: [1, 0.9, 1],
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    filterHover: "drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))",
  },
};

/**
 * AnimatedEmoji Component
 * Supports:
 * 1. Rive animation canvas if `src` is provided (.riv file)
 * 2. High-performance interactive animated emojis with hover/click reactions
 * 3. Particle bursts when clicked
 */
export const AnimatedEmoji = ({
  emoji,
  src,
  size = 20,
  interactive = true,
  className = "",
  style = {},
  onClick,
  autoAnimate = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState([]);

  // If a .riv URL is explicitly provided, render Rive canvas
  if (src) {
    return (
      <div
        className={`animated-rive-emoji ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: interactive ? "pointer" : "default",
          ...style,
        }}
        onClick={onClick}
      >
        <Rive src={src} autoplay={true} />
      </div>
    );
  }

  // Fallback / standard rich interactive emoji
  const preset = EMOJI_ANIMATIONS[emoji];

  const handleClick = (e) => {
    if (interactive) {
      // Spawn burst particles
      const newParticles = Array.from({ length: 4 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 40,
        y: -(Math.random() * 30 + 15),
        scale: Math.random() * 0.5 + 0.5,
      }));
      setParticles((prev) => [...prev, ...newParticles]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
      }, 700);
    }
    if (onClick) onClick(e);
  };

  return (
    <span
      className={`animated-emoji-wrapper ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        lineHeight: 1,
        ...style,
      }}
    >
      <motion.span
        role="img"
        aria-label="emoji"
        animate={
          autoAnimate && preset?.animate
            ? preset.animate
            : isHovered
            ? { scale: 1.25, rotate: 6 }
            : { scale: 1, rotate: 0 }
        }
        transition={preset?.transition || { type: "spring", stiffness: 350, damping: 15 }}
        whileHover={
          interactive
            ? {
                scale: 1.35,
                filter: preset?.filterHover || "drop-shadow(0 0 8px rgba(79, 70, 229, 0.4))",
                transition: { type: "spring", stiffness: 400, damping: 10 },
              }
            : {}
        }
        whileTap={interactive ? { scale: 0.85 } : {}}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          fontSize: `${size}px`,
          display: "inline-block",
          cursor: interactive ? "pointer" : "inherit",
          userSelect: "none",
          transformOrigin: "center center",
        }}
      >
        {emoji}
      </motion.span>

      {/* Interactive click burst particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: p.scale }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: p.scale * 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            style={{
              position: "absolute",
              fontSize: `${Math.round(size * 0.65)}px`,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 99,
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
};

/**
 * Interactive Emoji Reaction Bar (😍 ❤️ 😂 🔥 👋)
 * Allows users to react with animated emojis on leads, activities, or notes
 */
export const EmojiReactionBar = ({ onReact, activeReaction = null, className = "" }) => {
  const [selected, setSelected] = useState(activeReaction);
  const [reactionCounts, setReactionCounts] = useState({
    "😍": 0,
    "❤️": 0,
    "😂": 0,
    "🔥": 0,
    "👋": 0,
  });

  const emojis = ["😍", "❤️", "😂", "🔥", "👋"];

  const handleSelect = (emoji) => {
    setSelected(selected === emoji ? null : emoji);
    setReactionCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + (selected === emoji ? -1 : 1),
    }));
    if (onReact) onReact(emoji);
  };

  return (
    <div
      className={`emoji-reaction-bar ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        background: "var(--bg-secondary, #F1F5F9)",
        border: "1px solid var(--border-primary, #E2E8F0)",
        borderRadius: "9999px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {emojis.map((em) => {
        const isCurrent = selected === em;
        const count = reactionCounts[em] || 0;
        return (
          <motion.button
            key={em}
            type="button"
            onClick={() => handleSelect(em)}
            whileHover={{ scale: 1.22, y: -2 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: isCurrent ? "rgba(79, 70, 229, 0.12)" : "transparent",
              border: isCurrent ? "1px solid #6366F1" : "1px solid transparent",
              borderRadius: "9999px",
              padding: "4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
          >
            <AnimatedEmoji emoji={em} size={18} interactive={false} autoAnimate={isCurrent} />
            {count > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: isCurrent ? "#4F46E5" : "var(--text-secondary, #64748B)",
                }}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default AnimatedEmoji;
