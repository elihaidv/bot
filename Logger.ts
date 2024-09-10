import { CoralogixLogger, Log, LoggerConfig, Severity } from "coralogix-logger";
import { env } from "node:process";
import DB from "./DB.js";
import { promises as fs } from "fs";

export class BotLogger {
  static instance: BotLogger = new BotLogger();
  config = new LoggerConfig({
    applicationName: "itamarbot",
    privateKey: "7ac54874-4e53-5903-9122-8db714a125dc",
    subsystemName: "production",
  });

  logger: CoralogixLogger = new CoralogixLogger("Bot");

  localLogsPath = "logs/";
  localLogs: { [key: string]: any[] } = {};

  constructor() {
    this.initLocalLogs();
    if (!this.isSemulation && DB.ENVIROMENT != "LOCAL") {
      CoralogixLogger.configure(this.config);
    }
  }

  async initLocalLogs() {
    if ((await fs.stat(this.localLogsPath).catch((e) => null)) == null) {
      await fs.mkdir(this.localLogsPath);
    }
    const files = await fs.readdir(this.localLogsPath);
    files.forEach(async (file) => {
      const content = await fs.readFile(this.localLogsPath + file);
      this.localLogs[file] = JSON.parse(content.toString());
    });
  }

  saveLogFile(fileName: string) {
    fs.writeFile(
      this.localLogsPath + fileName,
      JSON.stringify(this.localLogs[fileName])
    );
  }

  log(message: any, severity: Severity = Severity.info) {
    if (!this.isSemulation && DB.ENVIROMENT != "LOCAL") {
      const logKey =
        new Date().toISOString().split(":")[0] +
        "~" +
        (message.bot_id || "general");

      this.localLogs[logKey] ||= [];

      this.localLogs[logKey].push({
        severity: severity,
        text: message,
      });
      this.saveLogFile(logKey);

      this.logger.addLog(
        new Log({
          severity: severity,
          text: JSON.stringify(message, (k, v) => (v === undefined ? null : v)),
        })
      );
    }
  }

  error(message: any) {
    this.log(message, Severity.error);
  }

  get isSemulation() {
    return env.IS_SIMULATION == "true";
  }
}
