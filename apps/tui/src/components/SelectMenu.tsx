import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

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
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, index) => (
          <Box key={option.value} paddingY={0}>
            <Text color={index === selectedIndex ? 'cyan' : 'white'}>
              {index === selectedIndex ? '> ' : '  '}
            </Text>
            <Text bold color={index === selectedIndex ? 'cyan' : 'white'}>
              {option.label}
            </Text>
            {option.description && (
              <Text color="gray"> - {option.description}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>[Up/Down] Navigate  [Enter] Select  [Esc] Cancel</Text>
      </Box>
    </Box>
  );
}
