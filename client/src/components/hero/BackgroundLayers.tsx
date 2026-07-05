import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundLayers({ mouseX, mouseY }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Layer 0: Mist Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-kolkata-mist to-white/60" />

      {/* Layer 1: Howrah Bridge Silhouette */}
      <motion.div 
        className="absolute bottom-0 w-[150%] h-[50vh] opacity-15"
        style={{ backgroundImage: 'url(/assets/howrah-bridge-silhouette.svg)', backgroundRepeat: 'repeat-x', backgroundSize: 'cover', backgroundPosition: 'bottom' }}
        animate={{ x: mouseX * -0.02, y: mouseY * -0.02 }}
      />

      {/* Layer 2: Tram Wires */}
      <motion.div 
        className="absolute top-0 w-[150%] h-[30vh] opacity-20"
        style={{ backgroundImage: 'url(/assets/tram-wire-pattern.svg)', backgroundRepeat: 'repeat-x', backgroundSize: 'contain' }}
        animate={{ x: mouseX * -0.04 }}
      />

      {/* Layer 4: Yellow Taxi (Running Element) */}
      <div className="absolute bottom-10 w-full h-12 opacity-80 z-10">
        <motion.div 
          animate={{ x: ['-20vw', '120vw'] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="h-full"
        >
          <img src="/assets/taxi-silhouette.svg" className="h-full" alt="Taxi" />
        </motion.div>
      </div>
      
      {/* City Fog Element */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/50 to-transparent"></div>
    </div>
  );
}
