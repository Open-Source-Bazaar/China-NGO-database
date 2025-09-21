#!/usr/bin/env tsx

/**
 * Refactored Strapi database import script using MobX-RESTful-migrator
 */

import * as fs from 'node:fs';
import { RestMigrator, ConsoleLogger } from 'mobx-restful-migrator';

import { ExcelReader } from './utils/excel-reader';
import { Config, SourceOrganization } from './types';
import { TargetOrganizationModel } from './models/strapi-models';
import { migrationMapping } from './migration/organization-mapping';

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
async function* loadOrganizationData(): AsyncGenerator<SourceOrganization> {
  console.log(`正在读取 Excel 文件: ${CONFIG.EXCEL_FILE}`);

  if (!fs.existsSync(CONFIG.EXCEL_FILE)) {
    throw new Error(`Excel 文件不存在: ${CONFIG.EXCEL_FILE}`);
  }

  // Use existing Excel reader
  const rawOrganizations = ExcelReader.readExcelFile(
    CONFIG.EXCEL_FILE,
    CONFIG.SHEET_NAME,
  );

  if (CONFIG.MAX_ROWS > 0) {
    rawOrganizations.splice(CONFIG.MAX_ROWS);
  }

  console.log(`从 Excel 读取到 ${rawOrganizations.length} 条记录`);

  // Yield each organization from existing reader
  yield* rawOrganizations;
}

// Main function
async function main(): Promise<void> {
  try {
    console.log(`
=== Strapi 数据导入工具 ===
`);
    if (CONFIG.DRY_RUN)
      console.log(`
🔥 DRY RUN 模式 - 不会实际创建数据
`);
    const migrator = new RestMigrator(
      loadOrganizationData,
      TargetOrganizationModel,
      migrationMapping,
      new ConsoleLogger(),
    );

    console.log('开始数据迁移...\n');

    let count = 0;
    for await (const organization of migrator.boot()) {
      count++;
      console.log(
        `✅ 成功导入第 ${count} 个组织: ${organization.name || 'Unknown'}`,
      );
    }

    console.log(`\n导入完成！共处理 ${count} 个组织`);
  } catch (error: any) {
    console.error('导入失败:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    process.exit(1);
  }
}

// Handle command line arguments
function parseArgs(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Strapi 数据导入工具 (重构版)

用法:
  tsx scripts/import-data-refactored.ts [选项]

选项:
  --dry-run, -d     仅模拟导入，不实际创建数据
  --help, -h        显示帮助信息

环境变量:
  STRAPI_URL        Strapi 服务器地址 (默认: http://localhost:1337)
  STRAPI_TOKEN      Strapi API Token
  EXCEL_FILE        Excel 文件路径 (默认: 教育公益开放式数据库.xlsx)
  SHEET_NAME        工作表名称 (默认: 使用第一个工作表)
  MAX_ROWS          最大处理行数 (默认: 0，表示全部)
  DRY_RUN           模拟运行 (true/false, 默认: false)
`);
    process.exit(0);
  }

  if (args.includes('--dry-run') || args.includes('-d')) {
    CONFIG.DRY_RUN = true;
  }
}

// Entry point
if (require.main === module) {
  parseArgs();
  main();
}

export { loadOrganizationData, migrationMapping };
