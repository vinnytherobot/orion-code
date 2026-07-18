import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { theme } from '../theme.js';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SelectMenuProps {
  title: string;
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  onCancel?: () => void;
}

export function SelectMenu({ title, options, onSelect, onCancel }: SelectMenuProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const selected = options[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
    } else if (key.escape || input === 'q') {
      if (onCancel) {
        onCancel();
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.secondary} padding={1} marginTop={1}>
      <Text bold color={theme.secondary}>
        {title}
      </Text>
      <Box flexDirection="column" marginTop={1} gap={0}>
        {options.map((option, index) => (
          <Box key={option.value} gap={1}>
            <Text color={index === selectedIndex ? theme.secondary : theme.textDim}>
              {index === selectedIndex ? '◉' : '○'}
            </Text>
            <Text bold color={index === selectedIndex ? theme.textBright : theme.text}>
              {option.label}
            </Text>
            {option.description && (
              <Text color={theme.textDim}>- {option.description}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Box marginTop={1} borderTop borderColor={theme.surfaceBorder} paddingTop={1}>
        <Text color={theme.textDim}>↑↓ Navigate · Enter Select · Esc Cancel</Text>
      </Box>
    </Box>
  );
}
