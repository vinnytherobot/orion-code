'use client';

import { motion } from 'framer-motion';

const ORION_LINES = [
  '  ██████╗ ██████╗  ██╗  ██████╗ ███╗   ██╗',
  ' ██╔═══██╗██╔══██╗ ██║ ██╔═══██╗████╗  ██║',
  ' ██║   ██║██████╔╝ ██║ ██║   ██║██╔██╗ ██║',
  ' ██║   ██║██╔══██╗ ██║ ██║   ██║██║╚██╗██║',
  ' ╚██████╔╝██║  ██║ ██║ ╚██████╔╝██║ ╚████║',
  '  ╚═════╝ ╚═╝  ╚═╝ ╚═╝  ╚═════╝ ╚═╝  ╚═══╝',
];

export function AsciiArt() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      }}
      className="select-none"
      aria-hidden="true"
    >
      <pre className="overflow-x-auto font-mono text-[8px] leading-tight text-primary sm:text-xs md:text-sm lg:text-base scrollbar-hide">
        {ORION_LINES.map((line, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 6, filter: 'blur(4px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {line}
          </motion.div>
        ))}
      </pre>
    </motion.div>
  );
}
