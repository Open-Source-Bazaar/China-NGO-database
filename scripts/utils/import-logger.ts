import * as fs from 'node:fs';
import * as path from 'node:path';
import { OrganizationData, LogEntry } from '../types';
import { LOG_CONSTANTS } from '../constants';

export class ImportLogger {
  private timestamp: string;
  private logDir: string;
  private failedFile: string;
  private userFailedFile: string;
  private skippedFile: string;
  public orgFailedCount: number = 0;
  public userFailedCount: number = 0;
  public skippedCount: number = 0;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = LOG_CONSTANTS.LOG_DIR;
    this.failedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.FAILED_LOG_PREFIX}${this.timestamp}.log`,
    );
    this.userFailedFile = path.join(
      this.logDir,
      `user-${LOG_CONSTANTS.FAILED_LOG_PREFIX}${this.timestamp}.log`,
    );
    this.skippedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.SKIPPED_LOG_PREFIX}${this.timestamp}.log`,
    );

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize log files with headers (async)
    this.initLogFiles().catch((error) => {
      console.error('初始化日志文件失败:', error);
    });
  }

  private async initLogFiles(): Promise<void> {
    const header = LOG_CONSTANTS.HEADER_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    await fs.promises.writeFile(this.failedFile, `# 组织失败记录\n${header}`);
    await fs.promises.writeFile(
      this.userFailedFile,
      `# 用户失败记录\n${header}`,
    );
    await fs.promises.writeFile(this.skippedFile, `# 跳过记录\n${header}`);

    console.log(`📝 日志文件已初始化:`);
    console.log(`   组织失败记录: ${this.failedFile}`);
    console.log(`   用户失败记录: ${this.userFailedFile}`);
    console.log(`   跳过记录: ${this.skippedFile}`);
  }

  async logFailed(orgData: OrganizationData, error: any): Promise<void> {
    this.orgFailedCount++;
    this.logToFailedFile(orgData, error);
  }

  async logUserFailed(orgData: OrganizationData, error: any): Promise<void> {
    this.userFailedCount++;
    this.logToUserFailedFile(orgData, error);
  }

  private async logToFailedFile(
    orgData: OrganizationData,
    error: any,
  ): Promise<void> {
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

    await fs.promises.appendFile(this.failedFile, logLine + detailLine);
  }

  private async logToUserFailedFile(
    orgData: OrganizationData,
    error: any,
  ): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      organization: {
        name: orgData.name,
        code: orgData.code,
        entityType: orgData.entityType,
        registrationCountry: orgData.registrationCountry,
      },
      error: error.message,
      errorDetails: error.response?.body?.error || error.stack,
    };

    // Append to log file immediately
    const logLine = `[${logEntry.timestamp}] ${orgData.name} | ${error.message}\n`;
    const detailLine = `   详细错误: ${JSON.stringify(logEntry.errorDetails, null, 2).replace(/\n/g, '\n   ')}\n\n`;

    await fs.promises.appendFile(this.userFailedFile, logLine + detailLine);
  }

  async logSkipped(orgData: OrganizationData, reason: string): Promise<void> {
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

    await fs.promises.appendFile(this.skippedFile, logLine + detailLine);
  }

  async saveToFiles(): Promise<void> {
    // Add summary to log files
    const summary = LOG_CONSTANTS.SUMMARY_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    if (this.orgFailedCount > 0) {
      const orgFailedSummary = `${summary}# 组织失败数: ${this.orgFailedCount}\n`;
      await fs.promises.appendFile(this.failedFile, orgFailedSummary);
      console.log(
        `✗ 组织失败记录已保存: ${this.failedFile} (${this.orgFailedCount} 条)`,
      );
    }

    if (this.userFailedCount > 0) {
      const userFailedSummary = `${summary}# 用户失败数: ${this.userFailedCount}\n`;
      await fs.promises.appendFile(this.userFailedFile, userFailedSummary);
      console.log(
        `✗ 用户失败记录已保存: ${this.userFailedFile} (${this.userFailedCount} 条)`,
      );
    }

    if (this.skippedCount > 0) {
      await fs.promises.appendFile(
        this.skippedFile,
        `${summary}# 总跳过数: ${this.skippedCount}\n`,
      );
      console.log(
        `📝 跳过记录已保存: ${this.skippedFile} (${this.skippedCount} 条)`,
      );
    }
  }

  getSummary(): { orgFailed: number; userFailed: number; skipped: number } {
    return {
      orgFailed: this.orgFailedCount,
      userFailed: this.userFailedCount,
      skipped: this.skippedCount,
    };
  }
}
