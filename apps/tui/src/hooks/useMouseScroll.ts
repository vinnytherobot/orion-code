import { useStdin, useStdout } from 'ink';
import { useEffect, useRef } from 'react';

interface UseMouseScrollOptions {
  onScrollUp?: () => void;
  onScrollDown?: () => void;
}

const WHEEL_UP = 64;
const WHEEL_DOWN = 65;
const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

/**
 * Captures mouse wheel events from the terminal stdin and invokes
 * onScrollUp / onScrollDown accordingly.
 *
 * The terminal must be in mouse-tracking mode. This hook enables
 * the SGR (1006) + button-event (1000) modes on mount, and restores
 * the previous state on unmount.
 *
 * We deliberately use button-event tracking (1000) instead of any-event
 * tracking (1003): 1000 reports wheel (buttons 64/65) and clicks as
 * press/release events, while 1003 also emits one event for EVERY pixel of
 * mouse movement. That continuous stream would leak raw SGR sequences
 * (`\x1b[<32;...M`, stray `;31m` fragments, etc.) into the prompt, since Ink
 * doesn't recognize them as keys. Wheel still arrives in 1000 mode, so no
 * scrolling functionality is lost.
 *
 * Pair this with a guard inside `useInput` that drops the raw SGR mouse
 * sequence from the `input` parameter — Ink does not recognize it as a known
 * key, so it would otherwise be typed into the prompt as garbage text.
 */
export function useMouseScroll({ onScrollUp, onScrollDown }: UseMouseScrollOptions): void {
  const { internal_eventEmitter } = useStdin();
  const { stdout } = useStdout();
  // Keep latest callbacks in refs so we don't have to re-attach the
  // listener on every render.
  const onUpRef = useRef(onScrollUp);
  const onDownRef = useRef(onScrollDown);
  onUpRef.current = onScrollUp;
  onDownRef.current = onScrollDown;

  useEffect(() => {
    if (!internal_eventEmitter || !stdout) return;

    // Enable mouse tracking:
    //   1000 = button-event tracking (wheel + clicks, but NOT continuous
    //         movement — avoids leaking SGR sequences for every mouse move)
    //   1006 = SGR encoding (modern terminals)
    stdout.write('\x1b[?1000h\x1b[?1006h');

    const onData = (data: string | Buffer) => {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      let match: RegExpExecArray | null;
      SGR_MOUSE_RE.lastIndex = 0;
      while ((match = SGR_MOUSE_RE.exec(text)) !== null) {
        const button = Number(match[1]);
        if (button === WHEEL_UP) {
          onUpRef.current?.();
        } else if (button === WHEEL_DOWN) {
          onDownRef.current?.();
        }
        // Other mouse events (clicks, moves, drags) are intentionally
        // ignored — we only handle wheel scrolling.
      }
    };

    internal_eventEmitter.on('input', onData);
    return () => {
      // Restore terminal to its previous mode on unmount
      stdout.write('\x1b[?1000l\x1b[?1006l');
      internal_eventEmitter.off('input', onData);
    };
  }, [internal_eventEmitter, stdout]);
}
