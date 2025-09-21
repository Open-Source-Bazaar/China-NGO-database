#!/usr/bin/env tsx

/**
 * Strapi database import script using MobX-RESTful-migrator
 * Support import NGO organization data from Excel file to Strapi database
 */

import { RestMigrator } from 'mobx-restful-migrator';

import { migrationMapping } from './transformers/data-transformer';
import { Config } from './types';
import { ExcelReader } from './utils/excel-reader';
import { ImportLogger } from './utils/import-logger';
import { TargetOrganizationModel } from './utils/strapi-api';

// Configuration
const CONFIG: Config = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  STRAPI_TOKEN: process.env.STRAPI_TOKEN || '',
  EXCEL_FILE: process.env.EXCEL_FILE || '教育公益开放式数据库.xlsx',
  SHEET_NAME: process.env.SHEET_NAME || null,
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '10'),
  BATCH_DELAY: parseInt(process.env.BATCH_DELAY || '0'),
  DRY_RUN: process.env.DRY_RUN === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '0'),
};

// Data source generator function
async function* loadOrganizationData() {
  console.log(`正在读取 Excel 文件: ${CONFIG.EXCEL_FILE}`);

  // Use existing Excel reader
  yield* ExcelReader.readExcelFile(CONFIG.EXCEL_FILE, CONFIG.SHEET_NAME);
}

// Main function
async function main(): Promise<void> {
  let logger: ImportLogger | null = null;

  // Handle process signals to ensure logs are saved on forced exit
  const handleExit = (signal: string) => {
    console.log(`\n收到 ${signal} 信号，正在保存日志...`);
    if (logger) {
      logger.saveToFiles();
      console.log('日志已保存，程序退出。');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));
  process.on('SIGQUIT', () => handleExit('SIGQUIT'));

  try {
    console.log('=== Strapi 数据导入工具 ===\n');

    // Validate configuration
    if (!CONFIG.STRAPI_TOKEN && !CONFIG.DRY_RUN) {
      throw new Error('请设置 STRAPI_TOKEN 环境变量或使用 DRY_RUN=true');
    }

    if (CONFIG.DRY_RUN) {
      console.log('🔥 DRY RUN 模式 - 不会实际创建数据\n');
    }

    // Initialize logger
    logger = new ImportLogger();

    // Create migrator instance
    const migrator = new RestMigrator(
      loadOrganizationData,
      TargetOrganizationModel,
      migrationMapping,
      logger,
    );

    console.log('开始数据迁移...\n');

    let count = 0;
    for await (const organization of migrator.boot()) {
      count++;
    }

    // Print final statistics
    logger.printStats();

    console.log('\n导入完成！');

    // Save logs to files
    await logger.saveToFiles();
  } catch (error: any) {
    console.error('导入失败:', error.message);
    console.error('错误堆栈:', error.stack);

    await logger?.saveToFiles();

    process.exit(1);
  }
}

// Handle command line arguments
function parseArgs(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Strapi 数据导入工具

支持从 Excel 文件导入 NGO 组织数据到 Strapi 数据库。

用法:
  tsx scripts/import-data.ts [选项]

选项:
  --dry-run, -d     仅模拟导入，不实际创建数据
  --help, -h        显示帮助信息

环境变量:
  STRAPI_URL        Strapi 服务器地址 (默认: http://localhost:1337)
  STRAPI_TOKEN      Strapi API Token
  EXCEL_FILE        Excel 文件路径 (默认: 教育公益开放式数据库.xlsx)
  SHEET_NAME        工作表名称 (默认: 使用第一个工作表)
  BATCH_SIZE        批次大小 (默认: 10) - 由迁移框架自动处理
  BATCH_DELAY       批次间延迟秒数 (默认: 0) - 由迁移框架自动处理
  MAX_ROWS          最大处理行数 (默认: 0，表示全部)
  DRY_RUN           模拟运行 (true/false, 默认: false)
  VERBOSE_LOGGING   详细日志 (true/false, 默认: false)

示例:
  # 基本使用
  STRAPI_TOKEN=your_token tsx scripts/import-data.ts
  
  # 指定工作表
  SHEET_NAME="甘肃省" STRAPI_TOKEN=your_token tsx scripts/import-data.ts
  
  # 仅测试前10行
  MAX_ROWS=10 DRY_RUN=true tsx scripts/import-data.ts
  
  # 设置详细日志
  VERBOSE_LOGGING=true STRAPI_TOKEN=your_token tsx scripts/import-data.ts
`);
    process.exit(0);
  }

  if (args.includes('--dry-run') || args.includes('-d')) {
    CONFIG.DRY_RUN = true;
  }
}

parseArgs();
main();
