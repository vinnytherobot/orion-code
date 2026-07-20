import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { theme } from '../theme.js';
import { getCommandSuggestions } from '../utils/commands.js';

interface PromptInputProps {
  onSubmit: (input: string) => void;
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  /**
   * Reports whether the up/down history hint should be visible and how
   * many commands are in the history. The parent (e.g. the App) uses
   * this to render the hint in a separate area (e.g. inside the
   * StatusBar) so the prompt box itself doesn't grow when the hint
   * appears.
   */
  onHistoryHintChange?: (info: { showHint: boolean; count: number }) => void;
}

export function PromptInput({ onSubmit, onScrollUp, onScrollDown, onHistoryHintChange }: PromptInputProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');
  const [isBashMode, setIsBashMode] = useState(false);

  // Notify the parent whenever the history hint visibility/count changes
  // so it can render the hint somewhere else (e.g. the StatusBar). This
  // effect depends on every input that determines hint visibility.
  useEffect(() => {
    const showHint = history.length > 0 && historyIndex === -1 && suggestions.length === 0 && !input;
    onHistoryHintChange?.({ showHint, count: history.length });
  }, [history.length, historyIndex, suggestions.length, input, onHistoryHintChange]);

  const updateSuggestions = (value: string) => {
    if (value.startsWith('/')) {
      const matches = getCommandSuggestions(value);
      setSuggestions(matches.map((cmd) => `/${cmd.name}`));
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setSelectedIndex(0);
    }
  };

  const handleSubmit = () => {
    const submittedValue =
      suggestions.length > 0 && selectedIndex >= 0 && suggestions[selectedIndex]
        ? suggestions[selectedIndex]!
        : input;

    if (submittedValue.trim()) {
      setHistory((prev) => [...prev, submittedValue]);
      onSubmit(submittedValue);
    }

    setInput('');
    setCursorPos(0);
    setSuggestions([]);
    setSelectedIndex(0);
    setHistoryIndex(-1);
    setTempInput('');
    if (isBashMode) setIsBashMode(false);
  };

  useInput((char, key) => {
    // === Drop raw mouse SGR sequences ===
    // When mouse tracking is on (see useMouseScroll), wheel events come in
    // as `\x1b[<64;X;Y M` / `\x1b[<65;X;Y M`. Ink's parseKeypress does not
    // recognize these as named keys, so the raw sequence leaks into `char`
    // and would otherwise be inserted into the prompt. Drop it here so the
    // wheel handler (in useMouseScroll) is the only thing that processes it.
    //
    // Two important details:
    //  1. Ink strips a leading `\x1b` from `keypress.sequence` before
    //     forwarding to the input handler (see use-input.js:73-75), so the
    //     `char` we see is `[<35;38;49M...` rather than `\x1b[<35;38;49M...`.
    //     The regex therefore must not require a leading `\x1b`.
    //  2. The terminal may emit multiple SGR sequences in a single chunk,
    //     e.g. `\x1b[<35;38;49M\x1b[<64;85;41M\x1b[<64;85;41M`. Ink forwards
    //     the whole concatenated string with only the leading `\x1b` stripped,
    //     so the value can look like `[<35;38;49M\x1b[<64;85;41M\x1b[<64;85;41M`.
    //     We treat the chunk as a mouse event iff it consists entirely of
    //     SGR mouse sequences (with optional inner `\x1b` separators) — that
    //     way ordinary text that happens to contain a semicolon is untouched.
    if (/^(\[<\d+;\d+;\d+[Mm]\x1b?)+$/.test(char)) {
      return;
    }

    // === Scroll keys ===
    if (key.pageUp) { onScrollUp?.(); return; }
    if (key.pageDown) { onScrollDown?.(); return; }

    // === Return / Submit ===
    if (key.return) {
      handleSubmit();
      return;
    }

    // === Suggestions navigation ===
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.tab) {
        if (suggestions[selectedIndex]) {
          const val = suggestions[selectedIndex]!;
          setInput(val);
          setCursorPos(val.length);
          setSuggestions([]);
          setSelectedIndex(0);
          if (val.startsWith('!')) setIsBashMode(true);
          else setIsBashMode(false);
        }
        return;
      }
    }

    // === History navigation (when input is empty or browsing) ===
    if (key.upArrow) {
      if (history.length === 0) return;
      if (historyIndex === -1) setTempInput(input);
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      const val = history[newIndex] || '';
      setInput(val);
      setCursorPos(val.length);
      setSuggestions([]);
      return;
    }
    if (key.downArrow) {
      if (historyIndex === -1) return;
      if (historyIndex >= history.length - 1) {
        setHistoryIndex(-1);
        setInput(tempInput);
        setCursorPos(tempInput.length);
      } else {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const val = history[newIndex] || '';
        setInput(val);
        setCursorPos(val.length);
      }
      setSuggestions([]);
      return;
    }

    // === Cursor movement ===
    if (key.leftArrow) {
      setCursorPos((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos((prev) => Math.min(input.length, prev + 1));
      return;
    }

    // === Backspace / Delete ===
    // In Ink v5, the `input` (char) is always an empty string for non-printable
    // keys like backspace/delete, so we can't rely on char === '\x7f' or '\x08'.
    // We rely on key.backspace (true when terminal sends \b) and key.delete
    // (true when terminal sends \x7f or the Delete ANSI sequence).
    // Windows terminals (ConPTY, Windows Terminal) typically send \x7f for
    // backspace, which Ink maps to key.delete === true. To distinguish from
    // the real Delete key, we check the raw sequence: backspace is a single
    // \x7f byte, while Delete is the ANSI escape \x1b[3~. We do this via the
    // `key` object's `name` indirectly by checking if cursor is at end-of-text
    // (most common backspace case) — but a cleaner approach: Ink v5 exposes
    // `key.name` through the internal keypress, but not directly. The safest
    // cross-platform fix is to accept BOTH key.backspace and key.delete as
    // backspace candidates, and use the cursor position + empty input as
    // disambiguators. Since real Delete produces \x1b[3~ which also yields
    // key.delete=true and empty input, we fall back to: if cursor is at end,
    // treat as backspace; otherwise treat as forward-delete.
    if (key.backspace) {
      if (cursorPos > 0) {
        const newVal = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
        setInput(newVal);
        setCursorPos((prev) => prev - 1);
        updateSuggestions(newVal.slice(0, cursorPos - 1));
        if (!newVal.startsWith('!')) setIsBashMode(false);
      }
      return;
    }
    if (key.delete) {
      // When cursor is at the end of input (cursorPos === input.length) and
      // there's something to delete before the cursor, this is most likely
      // the backspace key being sent as DEL (\x7f) by Windows terminals.
      // Real Delete only makes sense when there's text AFTER the cursor.
      if (cursorPos === input.length && cursorPos > 0) {
        // Treat as backspace: delete the character before the cursor.
        const newVal = input.slice(0, cursorPos - 1);
        setInput(newVal);
        setCursorPos((prev) => prev - 1);
        updateSuggestions(newVal);
        if (!newVal.startsWith('!')) setIsBashMode(false);
      } else if (cursorPos < input.length) {
        // Real forward delete: delete character after the cursor.
        const newVal = input.slice(0, cursorPos) + input.slice(cursorPos + 1);
        setInput(newVal);
        updateSuggestions(newVal);
        if (!newVal.startsWith('!')) setIsBashMode(false);
      }
      return;
    }

    // === Escape ===
    if (key.escape) {
      if (isBashMode) {
        setIsBashMode(false);
        setInput('');
        setCursorPos(0);
        setSuggestions([]);
      }
      return;
    }

    // === Ctrl+A / Ctrl+E (home/end) ===
    if (key.ctrl && char === 'a') { setCursorPos(0); return; }
    if (key.ctrl && char === 'e') { setCursorPos(input.length); return; }
    if (key.ctrl && char === 'c') { return; } // let Ink handle Ctrl+C

    // === Regular character input ===
    if (char && !key.ctrl && !key.meta) {
      const newVal = input.slice(0, cursorPos) + char + input.slice(cursorPos);
      setInput(newVal);
      setCursorPos((prev) => prev + char.length);
      updateSuggestions(newVal);
      if (newVal.startsWith('!')) setIsBashMode(true);
      else if (isBashMode) setIsBashMode(false);
      setHistoryIndex(-1);
    }
  });

  const promptColor = isBashMode ? theme.bashMode : theme.secondary;
  const promptSymbol = isBashMode ? '$' : '❯';
  const borderColor = isBashMode ? theme.bashMode : theme.surfaceBorder;
  const placeholder = isBashMode ? 'Type a shell command...' : 'Type a command or message...';

  // Build display text with cursor
  const beforeCursor = input.slice(0, cursorPos);
  const atCursor = input[cursorPos] || ' ';
  const afterCursor = input.slice(cursorPos + 1);

  return (
    <Box flexDirection="column" width="100%">
      <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1} width="100%">
        <Box width="100%">
          <Text color={promptColor} bold>
            {promptSymbol + ' '}
          </Text>
          {input.length === 0 && cursorPos === 0 ? (
            <Text>
              <Text inverse> </Text>
              <Text color={theme.textDim}>{placeholder}</Text>
            </Text>
          ) : (
            <Text>
              {beforeCursor && <Text>{beforeCursor}</Text>}
              <Text inverse>{atCursor}</Text>
              {afterCursor && <Text>{afterCursor}</Text>}
            </Text>
          )}
        </Box>
        {suggestions.length > 0 && (
          <Box flexDirection="column" paddingLeft={2} marginTop={1} borderLeft borderColor={theme.surfaceBorder}>
            {suggestions.slice(0, 8).map((suggestion, index) => (
              <Box key={suggestion} gap={1}>
                <Text
                  color={index === selectedIndex ? theme.secondary : theme.textDim}
                  inverse={index === selectedIndex}
                >
                  {index === selectedIndex ? '▸' : ' '}
                </Text>
                <Text
                  color={index === selectedIndex ? theme.textBright : theme.textDim}
                  bold={index === selectedIndex}
                >
                  {suggestion}
                </Text>
              </Box>
            ))}
            <Text color={theme.textDim}>
              ↑↓ navigate · Tab fill · Enter select
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
