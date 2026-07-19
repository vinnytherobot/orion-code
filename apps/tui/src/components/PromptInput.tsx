import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useState } from 'react';
import { theme } from '../theme.js';
import { getCommandSuggestions } from '../utils/commands.js';

interface PromptInputProps {
  onSubmit: (input: string) => void;
  onToggleBash?: () => void;
}

export function PromptInput({ onSubmit, onToggleBash }: PromptInputProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');

  const handleChange = (value: string) => {
    setInput(value);
    setHistoryIndex(-1);

    if (value.startsWith('/')) {
      const matches = getCommandSuggestions(value);
      const suggestionNames = matches.map((cmd) => `/${cmd.name}`);
      setSuggestions(suggestionNames);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setSelectedIndex(0);
    }
  };

  const handleSubmit = (value: string) => {
    const submittedValue =
      suggestions.length > 0 && selectedIndex >= 0 && suggestions[selectedIndex]
        ? suggestions[selectedIndex]!
        : value;

    if (submittedValue.trim()) {
      setHistory((prev) => [...prev, submittedValue]);
      onSubmit(submittedValue);
    }

    setInput('');
    setSuggestions([]);
    setSelectedIndex(0);
    setHistoryIndex(-1);
    setTempInput('');
  };

  useInput((_inputChar, key) => {
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
          setInput(suggestions[selectedIndex]!);
          setSuggestions([]);
          setSelectedIndex(0);
        }
        return;
      }
    }

    if (key.upArrow) {
      if (history.length === 0) return;

      if (historyIndex === -1) {
        setTempInput(input);
      }

      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);

      setHistoryIndex(newIndex);
      setInput(history[newIndex] || '');
      setSuggestions([]);
    }

    if (key.downArrow) {
      if (historyIndex === -1) return;

      if (historyIndex >= history.length - 1) {
        setHistoryIndex(-1);
        setInput(tempInput);
      } else {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
      setSuggestions([]);
    }

    if (_inputChar === '!' && !input) {
      onToggleBash?.();
      return;
    }
  });

  const showHistoryHint =
    history.length > 0 && historyIndex === -1 && suggestions.length === 0 && !input;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.surfaceBorder} paddingX={1}>
      <Box>
        <Text color={theme.secondary} bold>
          {'❯ '}
        </Text>
        <TextInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a command or message..."
        />
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
      {showHistoryHint && (
        <Box paddingLeft={2} marginTop={1}>
          <Text color={theme.textDim}>
            ↑↓ history ({history.length} commands)
          </Text>
        </Box>
      )}
    </Box>
  );
}
