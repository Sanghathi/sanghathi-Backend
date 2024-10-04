import {
  createLogger,
  format as _format,
  transports as _transports,
} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

class Logger {
  constructor() {
    const logFormat = _format.printf(
      ({ timestamp, level, message, ...meta }) => {
        return `${timestamp},${level},${message},"${JSON.stringify(
          meta
        ).replace(/"/g, '""')}"`;
      }
    );

    this.logger = createLogger({
      level: "info",
      format: _format.combine(
        _format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
      ),
      transports: [
        new DailyRotateFile({
          filename: "logs/error-%DATE%.log",
          level: "error",
          datePattern: "YYYY-MM-DD",
          maxSize: "10m",
          maxFiles: "14d",
        }),
        new DailyRotateFile({
          filename: "logs/combined-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "10m",
          maxFiles: "14d",
        }),
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new _transports.Console({
          format: _format.combine(
            _format.colorize(),

            logFormat
          ),
        })
      );
    }
  }

  //Log Message Levels
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }
}

const logger = new Logger().logger;
export default logger;
