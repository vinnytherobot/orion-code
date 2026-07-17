import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useState } from 'react';
import { getCommandSuggestions } from '../utils/commands.js';

interface PromptInputProps {
  onSubmit: (input: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps): React.ReactElement {
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

  // Handle arrow key navigation
  useInput((_inputChar, key) => {
    // Navigate suggestions if visible
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

    // Navigate command history
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
  });

  const showHistoryHint =
    history.length > 0 && historyIndex === -1 && suggestions.length === 0 && !input;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta" bold>
          {'> '}
        </Text>
        <TextInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a command or message..."
        />
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column" paddingLeft={2}>
          {suggestions.slice(0, 8).map((suggestion, index) => (
            <Text
              key={suggestion}
              color={index === selectedIndex ? 'magenta' : 'gray'}
              inverse={index === selectedIndex}
            >
              {index === selectedIndex ? '> ' : '  '}
              {suggestion}
            </Text>
          ))}
          <Text color="gray" dimColor>
            ↑↓ navigate · Tab to fill · Enter to select
          </Text>
        </Box>
      )}
      {showHistoryHint && (
        <Box paddingLeft={2}>
          <Text color="gray" dimColor>
            ↑↓ browse history ({history.length} commands)
          </Text>
        </Box>
      )}
    </Box>
  );
}
