import * as fs from 'node:fs';
import * as path from 'node:path';
import { OrganizationData, LogEntry } from '../types';
import { LOG_CONSTANTS } from '../constants';

export class ImportLogger {
  private timestamp: string;
  private logDir: string;
  private failedFile: string;
  private skippedFile: string;
  public failedCount: number = 0;
  public skippedCount: number = 0;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = LOG_CONSTANTS.LOG_DIR;
    this.failedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.FAILED_LOG_PREFIX}${this.timestamp}.log`,
    );
    this.skippedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.SKIPPED_LOG_PREFIX}${this.timestamp}.log`,
    );

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize log files with headers
    this.initLogFiles();
  }

  private initLogFiles(): void {
    const header = LOG_CONSTANTS.HEADER_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    fs.writeFileSync(this.failedFile, `# 失败记录\n${header}`);
    fs.writeFileSync(this.skippedFile, `# 跳过记录\n${header}`);

    console.log(`📝 日志文件已初始化:`);
    console.log(`   失败记录: ${this.failedFile}`);
    console.log(`   跳过记录: ${this.skippedFile}`);
  }

  logFailed(orgData: OrganizationData, error: any): void {
    this.failedCount++;
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      organization: {
        name: orgData.name,
        code: orgData.code,
        entityType: orgData.entityType,
        registrationCountry: orgData.registrationCountry,
      },
      error: error.message,
      errorDetails: error.response?.data || error.stack,
    };

    // Append to log file immediately
    const logLine = `[${logEntry.timestamp}] ${orgData.name} | ${error.message}\n`;
    const detailLine = `   详细错误: ${JSON.stringify(logEntry.errorDetails, null, 2).replace(/\n/g, '\n   ')}\n\n`;

    fs.appendFileSync(this.failedFile, logLine + detailLine);
  }

  logSkipped(orgData: OrganizationData, reason: string): void {
    this.skippedCount++;
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      organization: {
        name: orgData.name,
        code: orgData.code,
        entityType: orgData.entityType,
        registrationCountry: orgData.registrationCountry,
      },
      reason: reason,
    };

    // Append to log file immediately
    const logLine = `[${logEntry.timestamp}] ${orgData.name} | ${reason}\n`;
    const detailLine = `   详细信息: ${JSON.stringify(logEntry.organization, null, 2).replace(/\n/g, '\n   ')}\n\n`;

    fs.appendFileSync(this.skippedFile, logLine + detailLine);
  }

  saveToFiles(): void {
    // Add summary to log files
    const summary = LOG_CONSTANTS.SUMMARY_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    if (this.failedCount > 0) {
      fs.appendFileSync(
        this.failedFile,
        `${summary}# 总失败数: ${this.failedCount}\n`,
      );
      console.log(
        `✗ 失败记录已保存: ${this.failedFile} (${this.failedCount} 条)`,
      );
    }

    if (this.skippedCount > 0) {
      fs.appendFileSync(
        this.skippedFile,
        `${summary}# 总跳过数: ${this.skippedCount}\n`,
      );
      console.log(
        `📝 跳过记录已保存: ${this.skippedFile} (${this.skippedCount} 条)`,
      );
    }
  }

  getSummary(): { failed: number; skipped: number } {
    return {
      failed: this.failedCount,
      skipped: this.skippedCount,
    };
  }
}
