"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotLogger = void 0;
var coralogix_logger_1 = require("coralogix-logger");
var BotLogger = /** @class */ (function () {
    function BotLogger() {
        this.config = new coralogix_logger_1.LoggerConfig({
            applicationName: "itamarbot",
            privateKey: "7ac54874-4e53-5903-9122-8db714a125dc",
            subsystemName: "production",
        });
        this.logger = new coralogix_logger_1.CoralogixLogger("Bot");
        if (!this.isSemulation) {
            coralogix_logger_1.CoralogixLogger.configure(this.config);
        }
    }
    BotLogger.prototype.log = function (message, severity) {
        if (severity === void 0) { severity = coralogix_logger_1.Severity.info; }
        if (!this.isSemulation) {
            this.logger.addLog(new coralogix_logger_1.Log({
                severity: severity,
                text: JSON.stringify(message)
            }));
        }
    };
    BotLogger.prototype.error = function (message) {
        this.log(message, coralogix_logger_1.Severity.error);
    };
    Object.defineProperty(BotLogger.prototype, "isSemulation", {
        get: function () {
            return process.argv[1].includes("Simulate");
        },
        enumerable: false,
        configurable: true
    });
    BotLogger.instance = new BotLogger();
    return BotLogger;
}());
exports.BotLogger = BotLogger;
