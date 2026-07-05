import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingPages() {
  const pages = Array.from({ length: 12 });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {pages.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-aged-paper/60 backdrop-blur-sm border border-divider shadow-sm rounded-sm flex flex-col items-center justify-center gap-1"
          style={{
            width: Math.random() * 30 + 20 + 'px',
            height: Math.random() * 40 + 30 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, Math.random() * 80 - 40, 0],
            rotateZ: [0, 180, 360],
            rotateX: [0, 90, 180],
            rotateY: [0, 90, 180],
          }}
          transition={{
            duration: Math.random() * 15 + 15,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {/* Faint Bengali Text representation */}
          <div className="w-3/4 h-0.5 bg-midnight-ink/20 rounded-full"></div>
          <div className="w-1/2 h-0.5 bg-midnight-ink/20 rounded-full"></div>
          <div className="w-2/3 h-0.5 bg-midnight-ink/20 rounded-full"></div>
        </motion.div>
      ))}
    </div>
  );
}
