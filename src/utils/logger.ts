type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function log(
  level: LogLevel,
  scope: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(metadata && { metadata }),
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (scope: string, message: string, metadata?: Record<string, unknown>) =>
    log('debug', scope, message, metadata),
  info: (scope: string, message: string, metadata?: Record<string, unknown>) =>
    log('info', scope, message, metadata),
  warn: (scope: string, message: string, metadata?: Record<string, unknown>) =>
    log('warn', scope, message, metadata),
  error: (scope: string, message: string, metadata?: Record<string, unknown>) =>
    log('error', scope, message, metadata),
};
