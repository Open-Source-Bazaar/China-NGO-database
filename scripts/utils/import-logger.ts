import * as fs from 'node:fs';
import * as path from 'node:path';
import { MigrationEventBus, MigrationProgress } from 'mobx-restful-migrator';
import { TargetOrganization, LogEntry, SourceOrganization } from '../types';
import { LOG_CONSTANTS } from '../constants';

export class ImportLogger implements MigrationEventBus<SourceOrganization, TargetOrganization> {
  private timestamp: string;
  private logDir: string;
  private failedFile: string;
  private userFailedFile: string;
  private skippedFile: string;
  public orgFailedCount: number = 0;
  public userFailedCount: number = 0;
  public skippedCount: number = 0;
  #stats = { total: 0, success: 0, failed: 0, skipped: 0 };

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

  async logFailed(orgData: TargetOrganization, error: any): Promise<void> {
    this.orgFailedCount++;
    this.logToFailedFile(orgData, error);
  }

  async logUserFailed(orgData: TargetOrganization, error: any): Promise<void> {
    this.userFailedCount++;
    this.logToUserFailedFile(orgData, error);
  }

  private async logToFailedFile(
    orgData: TargetOrganization,
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
    orgData: TargetOrganization,
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

  async logSkipped(orgData: TargetOrganization, reason: string): Promise<void> {
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

  // MigrationEventBus interface methods
  async save({ index, sourceItem, targetItem }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.#stats.total++;
    this.#stats.success++;
    
    console.log(`✅ [${index}] 成功导入: ${targetItem?.name || sourceItem?.常用名称 || 'Unknown'}`);
    
    // Log detailed information if needed
    if (process.env.VERBOSE_LOGGING === 'true') {
      console.log(`   源数据: ${sourceItem?.常用名称} (${sourceItem?.实体类型})`);
      console.log(`   目标: ID=${targetItem?.id}, 类型=${targetItem?.entityType}\n`);
    }
  }

  async skip({ index, sourceItem, error }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.#stats.total++;
    this.#stats.skipped++;
    this.skippedCount++;

    console.log(`⚠️ [${index}] 跳过: ${sourceItem?.常用名称 || 'Unknown'} - ${error?.message}`);

    // Use original source data for logging
    if (sourceItem) {
      await this.logSkipped(
        sourceItem as any, // Use source data directly
        error?.message || '数据跳过'
      );
    }
  }

  async error({ index, sourceItem, error }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.#stats.total++;
    this.#stats.failed++;
    this.orgFailedCount++;

    console.error(`❌ [${index}] 处理失败: ${sourceItem?.常用名称 || 'Unknown'} - ${error?.message}`);

    // Use original source data for logging
    if (sourceItem) {
      await this.logFailed(
        sourceItem as any, // Use source data directly
        error || new Error('未知错误')
      );
    }
  }

  // Get migration statistics
  get stats() {
    return this.#stats;
  }

  // Print final statistics
  printStats() {
    const { total, success, failed, skipped } = this.#stats;
    const successRate = ((success / total) * 100).toFixed(1);
    
    console.log(`
=== 迁移统计 ===
总数: ${total}
成功: ${success}
失败: ${failed}
跳过: ${skipped}
成功率: ${successRate}%${failed > 0 || skipped > 0 ? '\n\n详细日志已保存到 logs/ 目录' : ''}`);
  }
}
