import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useCallback, useState } from 'react';
import { theme } from '../theme.js';
import { execCommand, type BashResult } from '../utils/bash.js';

interface BashModeProps {
  onExit: () => void;
}

interface BashHistoryEntry {
  command: string;
  result: BashResult;
}

export function BashMode({ onExit }: BashModeProps): React.ReactElement {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<BashHistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed === '!' || trimmed === 'exit') {
      onExit();
      return;
    }

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput('');
    setIsExecuting(true);

    const result = await execCommand(trimmed);
    setHistory(prev => [...prev, { command: trimmed, result }]);
    setIsExecuting(false);
  }, [onExit]);

  useInput((_inputChar, key) => {
    if (key.escape) {
      onExit();
      return;
    }

    if (key.upArrow && commandHistory.length > 0) {
      const newIndex = historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || '');
    }

    if (key.downArrow && historyIndex >= 0) {
      if (historyIndex >= commandHistory.length - 1) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text color={theme.warning} bold>
          [BASH MODE] Press ! or type "exit" to return
        </Text>
      </Box>

      {history.map((entry, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={theme.secondary}>$</Text>
            <Text color={theme.text}>{entry.command}</Text>
          </Box>
          {entry.result.stdout && (
            <Text color={theme.textDim}>{entry.result.stdout}</Text>
          )}
          {entry.result.stderr && (
            <Text color={theme.error}>{entry.result.stderr}</Text>
          )}
          {entry.result.exitCode !== 0 && !entry.result.stderr && (
            <Text color={theme.error}>Exit code: {entry.result.exitCode}</Text>
          )}
        </Box>
      ))}

      <Box>
        <Text color={theme.secondary}>$ </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={isExecuting ? 'Executing...' : ''}
        />
      </Box>
    </Box>
  );
}
