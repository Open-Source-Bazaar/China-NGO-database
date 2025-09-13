#!/usr/bin/env tsx

/**
 * Strapi database import script (Refactored)
 * Support import NGO organization data from Excel file to Strapi database
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Config, OrganizationData, ExtendedUserData } from './types';

// Create WeakMap to store user data for organizations
const userWeakMap = new WeakMap<OrganizationData, ExtendedUserData>();

// Import refactored modules
import { DataTransformer } from './transformers/data-transformer';
import { ExcelReader } from './utils/excel-reader';
import { StrapiAPI } from './utils/strapi-api';
import { DataImporter } from './utils/data-importer';

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

// Main function
async function main(): Promise<void> {
  let importer: DataImporter | null = null;

  // Handle process signals to ensure logs are saved on forced exit
  const handleExit = (signal: string) => {
    console.log(`\n收到 ${signal} 信号，正在保存日志...`);
    if (importer?.logger) {
      importer.logger.saveToFiles();
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

    const excelPath = path.join(process.cwd(), CONFIG.EXCEL_FILE);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel 文件不存在: ${excelPath}`);
    }

    // Read Excel data
    console.log('读取 Excel 数据...');
    const rawData = ExcelReader.readExcelFile(excelPath, CONFIG.SHEET_NAME);

    // Limit data for testing
    const limitedData =
      CONFIG.MAX_ROWS > 0 ? rawData.slice(0, CONFIG.MAX_ROWS) : rawData;
    if (CONFIG.MAX_ROWS > 0) {
      console.log(
        `限制导入数据量: ${limitedData.length} 行 (总共 ${rawData.length} 行)`,
      );
    }

    // Transform data format with user support
    console.log('转换数据格式...');
    const organizations = limitedData
      .map((row) => {
        try {
          const organization = DataTransformer.transformOrganization(row);

          // Extract user data from the same row
          const userData = DataTransformer.transformUser(row);

          // Attach user data for later processing using WeakMap
          if (userData) {
            userWeakMap.set(organization, userData);
          }

          return organization;
        } catch (error: any) {
          const orgName = row['常用名称'] || row.name || 'Unknown';
          console.warn(`转换数据失败，跳过行: ${orgName}`, error.message);
          return null;
        }
      })
      .filter((org): org is OrganizationData => org !== null && !!org.name);

    console.log(`转换完成，准备导入 ${organizations.length} 个组织\n`);

    // Show examples in dry run mode
    if (CONFIG.DRY_RUN) {
      console.log('=== DRY RUN 模式 ===');
      for (const [index, org] of organizations.slice(0, 3).entries()) {
        console.log(`示例 ${index + 1}:`, JSON.stringify(org, null, 2));
      }
      console.log('==================\n');
    }

    // Initialize API client and importer
    const api = new StrapiAPI(CONFIG.STRAPI_URL, CONFIG.STRAPI_TOKEN);
    importer = new DataImporter(
      api,
      userWeakMap,
      CONFIG.BATCH_SIZE,
      CONFIG.BATCH_DELAY,
      CONFIG.DRY_RUN,
    );

    // Start import
    await importer.importOrganizations(organizations);

    console.log('导入完成！');
  } catch (error: any) {
    console.error('导入失败:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
function parseArgs(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Strapi 数据导入工具 (增强版)

支持同时导入组织信息和联系人用户，并自动建立关联关系。

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
  BATCH_SIZE        批次大小 (默认: 10)
  BATCH_DELAY       批次间延迟秒数 (默认: 0, 表示无延迟)
  MAX_ROWS          最大导入行数 (默认: 0, 表示导入所有行)
  DRY_RUN           模拟模式 (true/false)

功能特性:
  - 导入组织基本信息
  - 自动创建联系人用户账户
  - 建立组织与用户的关联关系
  - 支持用户名冲突自动处理
  - 重复检查和错误处理

示例:
  # 正常导入
  STRAPI_TOKEN=your_token tsx import-data.ts
  
  # 模拟导入
  DRY_RUN=true tsx import-data.ts
  
  # 导入指定工作表
  SHEET_NAME="甘肃省" STRAPI_TOKEN=your_token tsx import-data.ts
  
  # 仅测试前10行
  MAX_ROWS=10 DRY_RUN=true tsx import-data.ts
  
  # 设置批次间延迟
  BATCH_DELAY=2 STRAPI_TOKEN=your_token tsx import-data.ts
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

export { DataTransformer, ExcelReader, DataImporter, StrapiAPI };
