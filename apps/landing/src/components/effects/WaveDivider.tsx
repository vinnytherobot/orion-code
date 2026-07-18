'use client';

import { cn } from '@/lib/utils';

interface WaveDividerProps {
  className?: string;
  flip?: boolean;
}

export function WaveDivider({ className, flip = false }: WaveDividerProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden leading-[0] pointer-events-none select-none text-border/40',
        flip ? 'rotate-180' : '',
        className,
      )}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block w-full h-[16px] sm:h-[20px] md:h-[24px]"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,0 C150,90 350,90 500,40 C650,-10 850,-10 1000,40 C1150,90 1200,50 1200,50 L1200,120 L0,120 Z"
          className="fill-background"
        />
        <path
          d="M0,0 C150,90 350,90 500,40 C650,-10 850,-10 1000,40 C1150,90 1200,50 1200,50 L1200,120 L0,120 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
