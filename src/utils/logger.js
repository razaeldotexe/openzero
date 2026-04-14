const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
};

class Logger {
    static formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}`;
    }

    static info(message) {
        console.log(this.formatMessage(LogLevel.INFO, message));
    }

    static warn(message) {
        console.warn(this.formatMessage(LogLevel.WARN, message));
    }

    static error(message, err = null) {
        console.error(this.formatMessage(LogLevel.ERROR, message));
        if (err) {
            console.error(err);
        }
    }

    static debug(message) {
        if (process.env.DEBUG === 'true') {
            console.debug(this.formatMessage(LogLevel.DEBUG, message));
        }
    }
}

export default Logger;
