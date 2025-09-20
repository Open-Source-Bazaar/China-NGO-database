#!/usr/bin/env tsx

/**
 * Simplified refactored Strapi database import script using MobX-RESTful-migrator
 * Support import NGO organization data from Excel file to Strapi database
 */

import * as fs from 'node:fs';
import {
  RestMigrator,
  MigrationSchema,
  ConsoleLogger,
} from 'mobx-restful-migrator';

// Import from existing system
import { ExcelReader } from './utils/excel-reader';
import { DataTransformer } from './transformers/data-transformer';
import { Config, OrganizationData, Organization } from './types';

// Simple configuration
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

// Create a simple mock model for testing the refactoring approach
import { ListModel, DataObject } from 'mobx-restful';

class MockOrganizationModel extends ListModel<OrganizationData> {
  baseURI = 'organizations';
  mockData: OrganizationData[] = [];

  async loadPage() {
    return { pageData: this.mockData, totalCount: this.mockData.length };
  }

  async updateOne(data: Partial<OrganizationData>) {
    const org = {
      id: this.mockData.length + 1,
      ...data,
    } as OrganizationData;

    this.mockData.push(org);
    return org;
  }
}

// Data source generator function
async function* loadOrganizationData(): AsyncGenerator<Organization> {
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
  for (const rawOrg of rawOrganizations) {
    yield rawOrg;
  }
}

// Create simple migration schema that reuses existing transformers
const migrationMapping: MigrationSchema<Organization, OrganizationData> = {
  // Use existing DataTransformer but adapt to migrator format
  常用名称: (organization) => {
    // Transform the entire organization using existing logic
    const transformed = DataTransformer.transformOrganization(organization);

    // Return all transformed fields at once
    return {
      name: { value: transformed.name },
      code: { value: transformed.code },
      entityType: { value: transformed.entityType },
      registrationCountry: { value: transformed.registrationCountry },
      establishedDate: { value: transformed.establishedDate },
      coverageArea: { value: transformed.coverageArea },
      description: { value: transformed.description },
      staffCount: { value: transformed.staffCount },
      address: { value: transformed.address },
      services: { value: transformed.services },
      internetContact: { value: transformed.internetContact },
      qualifications: { value: transformed.qualifications },
    };
  },
};

// Main function
async function main(): Promise<void> {
  try {
    console.log('=== Strapi 数据导入工具 (重构版) ===\n');

    if (CONFIG.DRY_RUN) {
      console.log('🔥 DRY RUN 模式 - 不会实际创建数据\n');
    }

    // Create migrator instance with mock model for testing
    const migrator = new RestMigrator(
      loadOrganizationData,
      MockOrganizationModel,
      migrationMapping,
      new ConsoleLogger(),
    );

    console.log('开始数据迁移...\n');

    let count = 0;
    for await (const organization of migrator.boot()) {
      count++;
      console.log(
        `✅ 成功处理第 ${count} 个组织: ${organization.name || 'Unknown'}`,
      );

      // In DRY_RUN mode, just show what would be processed
      if (CONFIG.DRY_RUN && count >= 3) {
        console.log('... (DRY_RUN 模式，仅显示前3个示例)');
        break;
      }
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
Strapi 数据导入工具 (重构版 - 使用 MobX-RESTful-migrator)

支持从 Excel 文件导入 NGO 组织数据到 Strapi 数据库。

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

示例:
  # 基本使用 (模拟模式)
  DRY_RUN=true tsx scripts/import-data-refactored.ts
  
  # 仅测试前10行
  MAX_ROWS=10 DRY_RUN=true tsx scripts/import-data-refactored.ts
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
