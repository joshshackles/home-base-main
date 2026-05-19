type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type LogInput = {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: unknown;
};

const levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();
  if (["debug", "info", "warn", "error"].includes(raw)) return raw as LogLevel;
  return "info";
}

function shouldLog(level: LogLevel) {
  return levelRank[level] >= levelRank[configuredLevel()];
}

function normalizeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    };
  }
  return error;
}

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  const redacted: LogContext = {};
  for (const [key, entry] of Object.entries(value as LogContext)) {
    if (/password|token|secret|authorization|cookie|session/i.test(key)) {
      redacted[key] = "[redacted]";
    } else if (entry && typeof entry === "object") {
      redacted[key] = redact(entry);
    } else {
      redacted[key] = entry;
    }
  }
  return redacted;
}

export function log(input: LogInput) {
  if (!shouldLog(input.level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level: input.level,
    app: "homebase-mls",
    message: input.message,
    context: input.context ? redact(input.context) : undefined,
    error: normalizeError(input.error)
  };

  const line = JSON.stringify(payload);
  if (input.level === "error") console.error(line);
  else if (input.level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    log({ level: "debug", message, context });
  },
  info(message: string, context?: LogContext) {
    log({ level: "info", message, context });
  },
  warn(message: string, context?: LogContext) {
    log({ level: "warn", message, context });
  },
  error(message: string, error?: unknown, context?: LogContext) {
    log({ level: "error", message, error, context });
  }
};
