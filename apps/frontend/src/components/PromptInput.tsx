import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getCommandSuggestions } from '../utils/commands.js';

interface PromptInputProps {
  onSubmit: (input: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const handleChange = (value: string) => {
    setInput(value);

    if (value.startsWith('/')) {
      const matches = getCommandSuggestions(value);
      const suggestionNames = matches.map(cmd => `/${cmd.name}`);
      setSuggestions(suggestionNames);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (value: string) => {
    if (suggestions.length > 0 && selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
      onSubmit(suggestions[selectedSuggestion]!);
    } else {
      onSubmit(value);
    }
    setInput('');
    setSuggestions([]);
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>{'> '}</Text>
        <TextInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a command or message..."
        />
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <Text
              key={suggestion}
              color={index === selectedSuggestion ? 'cyan' : 'gray'}
              inverse={index === selectedSuggestion}
            >
              {suggestion}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
