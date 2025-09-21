import { MigrationEventBus, MigrationProgress } from 'mobx-restful-migrator';
import { SourceOrganization, TargetOrganization } from '../types';
import { ImportLogger } from './import-logger';

/**
 * Custom logger that adapts the existing ImportLogger to work with MobX-RESTful-migrator
 */
export class MigratorLogger implements MigrationEventBus<SourceOrganization, TargetOrganization> {
  private importLogger: ImportLogger;
  private stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  constructor() {
    this.importLogger = new ImportLogger();
  }

  async save({ index, sourceItem, targetItem }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.stats.total++;
    this.stats.success++;
    
    console.log(`✅ [${index}] 成功导入: ${targetItem?.name || sourceItem?.常用名称 || 'Unknown'}`);
    
    // Log detailed information if needed
    if (process.env.VERBOSE_LOGGING === 'true') {
      console.log(`   源数据: ${sourceItem?.常用名称} (${sourceItem?.实体类型})`);
      console.log(`   目标: ID=${targetItem?.id}, 类型=${targetItem?.entityType}\n`);
    }
  }

  async skip({ index, sourceItem, error }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.stats.total++;
    this.stats.skipped++;
    this.importLogger.skippedCount++;

    console.log(`⚠️ [${index}] 跳过: ${sourceItem?.常用名称 || 'Unknown'} - ${error?.message}`);

    // Use existing logger for detailed logging
    if (sourceItem) {
      await this.importLogger.logSkipped(
        this.convertToOrganizationData(sourceItem),
        error?.message || '数据跳过'
      );
    }
  }

  async error({ index, sourceItem, error }: MigrationProgress<SourceOrganization, TargetOrganization>) {
    this.stats.total++;
    this.stats.failed++;
    this.importLogger.orgFailedCount++;

    console.error(`❌ [${index}] 处理失败: ${sourceItem?.常用名称 || 'Unknown'} - ${error?.message}`);

    // Use existing logger for detailed error logging
    if (sourceItem) {
      await this.importLogger.logFailed(
        this.convertToOrganizationData(sourceItem), 
        error || new Error('未知错误')
      );
    }
  }

  // Convert SourceOrganization to OrganizationData format expected by ImportLogger
  private convertToOrganizationData(source: SourceOrganization): any {
    return {
      name: source.常用名称 || '',
      code: source.机构信用代码 || '',
      entityType: source.实体类型 || '',
      registrationCountry: source.注册国籍 || '',
      description: source['机构／项目简介'] || '',
    };
  }

  // Get final statistics
  getStats() {
    return this.stats;
  }

  // Save logs using existing logger
  async saveToFiles() {
    return this.importLogger.saveToFiles();
  }

  // Print final statistics
  printStats() {
    console.log('\n=== 迁移统计 ===');
    console.log(`总数: ${this.stats.total}`);
    console.log(`成功: ${this.stats.success}`);
    console.log(`失败: ${this.stats.failed}`);
    console.log(`跳过: ${this.stats.skipped}`);
    console.log(`成功率: ${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`);
    
    if (this.stats.failed > 0 || this.stats.skipped > 0) {
      console.log(`\n详细日志已保存到 logs/ 目录`);
    }
  }
}