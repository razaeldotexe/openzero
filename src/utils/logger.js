const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
};

const Colors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    FgBlack: '\x1b[30m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
    FgYellow: '\x1b[33m',
    FgBlue: '\x1b[34m',
    FgMagenta: '\x1b[35m',
    FgCyan: '\x1b[36m',
    FgWhite: '\x1b[37m',
    FgGray: '\x1b[90m',

    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
};

class Logger {
    static formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        let color = Colors.FgWhite;

        switch (level) {
            case LogLevel.INFO:
                color = Colors.FgGreen;
                break;
            case LogLevel.WARN:
                color = Colors.FgYellow;
                break;
            case LogLevel.ERROR:
                color = Colors.FgRed;
                break;
            case LogLevel.DEBUG:
                color = Colors.FgMagenta;
                break;
        }

        const coloredTimestamp = `${Colors.FgGray}[${timestamp}]${Colors.Reset}`;
        const coloredLevel = `${color}${Colors.Bright}[${level}]${Colors.Reset}`;

        return `${coloredTimestamp} ${coloredLevel} ${message}`;
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
