import { CoralogixLogger, Log, LoggerConfig, Severity } from "coralogix-logger";

export class BotLogger {
    static instance: BotLogger = new BotLogger();
    config = new LoggerConfig({
        applicationName: "itamarbot",
        privateKey: "7ac54874-4e53-5903-9122-8db714a125dc",
        subsystemName: "production",
    });

    logger: CoralogixLogger = new CoralogixLogger("Bot")

    constructor() {
        if (!this.isSemulation) {
            CoralogixLogger.configure(this.config);
        }
    }

    log(message: any, severity: Severity = Severity.info) {
        if (!this.isSemulation) {
            this.logger.addLog(new Log({
                severity: severity,
                text: JSON.stringify(message, (k, v)=> v === undefined ? null : v)
            }));
        }
    }

    error(message: any) {
        this.log(message, Severity.error)
    }

    get isSemulation() {
        return process.argv.join("").includes("Simulat")
    }
}