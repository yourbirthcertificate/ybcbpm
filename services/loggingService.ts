
type LogLevel = 'INFO' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
}

// Store logs in memory for the duration of the session
const logs: LogEntry[] = [];

const log = (level: LogLevel, message: string, details?: any) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details: details ? (details instanceof Error ? { name: details.name, message: details.message, stack: details.stack } : details) : undefined,
  };
  logs.push(entry);
  
  // Also output to console for real-time debugging
  if (level === 'ERROR') {
    console.error(`[${entry.timestamp}] ${entry.message}`, entry.details || '');
  } else {
    console.log(`[${entry.timestamp}] ${entry.message}`, entry.details || '');
  }
};

export const logInfo = (message: string, details?: any) => {
  log('INFO', message, details);
};

export const logError = (message: string, details?: any) => {
  log('ERROR', message, details);
};

const formatLogsToString = (): string => {
  return logs.map(entry => {
    let logString = `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
    if (entry.details) {
      try {
        logString += `\nDETAILS: ${JSON.stringify(entry.details, null, 2)}`;
      } catch (e) {
        logString += `\nDETAILS: (Could not stringify details)`;
      }
    }
    return logString;
  }).join('\n\n');
};

export const downloadLogs = () => {
    if (logs.length === 0) {
        alert("No logs have been recorded yet.");
        return;
    }

    const logContent = formatLogsToString();
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bpm-detector-log.txt';
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};