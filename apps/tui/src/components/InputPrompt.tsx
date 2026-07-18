import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { theme } from '../theme.js';

interface InputPromptProps {
  title: string;
  placeholder?: string;
  masked?: boolean;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}

export function InputPrompt({ title, placeholder, masked, onSubmit, onCancel }: InputPromptProps) {
  const [value, setValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onCancel?.();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.secondary} padding={1} marginTop={1}>
      <Text bold color={theme.secondary}>
        {title}
      </Text>
      <Box marginTop={1} paddingX={1}>
        {masked && (
          <Text color={theme.warning} bold>
            ◆{' '}
          </Text>
        )}
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          placeholder={placeholder}
          mask={masked ? '*' : undefined}
        />
      </Box>
      <Box marginTop={1} borderTop borderColor={theme.surfaceBorder} paddingTop={1}>
        <Text color={theme.textDim}>Enter Submit · Esc Cancel</Text>
      </Box>
    </Box>
  );
}
