/**
 * Logger - Covert logging system for operational intelligence
 * Maintains detailed logs while appearing as standard service logging
 */
export class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'info',
      message,
      ...(data && { data })
    };

    console.log(JSON.stringify(logEntry));
  }

  logError(message, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    console.error(JSON.stringify(logEntry));
  }

  logRequest(req, res, duration) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'request',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    console.log(JSON.stringify(logEntry));
  }

  logDatabaseOperation(operation, table, duration, recordCount = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      type: 'database',
      operation,
      table,
      duration: `${duration}ms`,
      ...(recordCount !== null && { recordCount })
    };

    if (this.logLevel === 'debug') {
      console.log(JSON.stringify(logEntry));
    }
  }
}