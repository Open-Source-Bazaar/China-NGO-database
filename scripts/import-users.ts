#!/usr/bin/env tsx

/**
 * 用户联系人导入脚本
 * 专门为已存在的组织创建联系人记录
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Config, ExtendedUserData } from './types';

// Import modules
import { DataTransformer } from './transformers/data-transformer';
import { ExcelReader } from './utils/excel-reader';
import { StrapiAPI } from './utils/strapi-api';

// Configuration
const CONFIG: Config = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  STRAPI_TOKEN: process.env.STRAPI_TOKEN || '',
  EXCEL_FILE: process.env.EXCEL_FILE || '教育公益开放式数据库.xlsx',
  SHEET_NAME: process.env.SHEET_NAME || null,
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '10'),
  DRY_RUN: process.env.DRY_RUN === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '0'),
};

// Main function
async function main(): Promise<void> {
  try {
    console.log('=== 用户联系人导入工具 ===\n');

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

    // Transform user data
    console.log('转换用户数据格式...');
    let userCount = 0;
    const usersWithOrgName = limitedData
      .map((row) => {
        try {
          const user = DataTransformer.transformUser(row);

          if (user) {
            // 添加组织名称用于显示
            const orgName = row['常用名称'] || row.name || 'Unknown';
            return {
              userData: user,
              organizationName: orgName,
            };
          }

          return null;
        } catch (error: any) {
          const orgName = row['常用名称'] || row.name || 'Unknown';
          console.warn(`转换用户数据失败，跳过行: ${orgName}`, error.message);
          return null;
        }
      })
      .filter(
        (
          item,
        ): item is { userData: ExtendedUserData; organizationName: string } =>
          item !== null && !!item.userData.email,
      );

    console.log(
      `转换完成，准备为 ${usersWithOrgName.length} 个组织创建联系人记录\n`,
    );

    // Show examples in dry run mode
    if (CONFIG.DRY_RUN) {
      console.log('=== DRY RUN 模式 ===');
      const examples = usersWithOrgName.slice(0, 3);
      for (let i = 0; i < examples.length; i++) {
        console.log(`示例 ${i + 1}:`, JSON.stringify(examples[i], null, 2));
      }
      console.log('==================\n');
    }

    // Initialize API client
    const api = new StrapiAPI(CONFIG.STRAPI_URL, CONFIG.STRAPI_TOKEN);

    // Import users
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const item of usersWithOrgName) {
      const { userData, organizationName } = item;

      console.log(
        `📝 处理组织 [${organizationName}] 的联系人: ${userData.username} (${userData.email})`,
      );

      try {
        if (CONFIG.DRY_RUN) {
          console.log(`[DRY RUN] 将创建联系人记录: ${userData.email}`);
          successCount++;
          continue;
        }

        // Check if user already exists
        const existingUser = await api.findUserByEmail(userData.email);
        if (existingUser) {
          console.log(`  ⚠️ 联系人记录已存在: ${userData.email}`);
          skipCount++;
          continue;
        }

        // Create new user
        await api.createUser(userData);
        console.log(
          `  ✅ 成功创建联系人记录: ${userData.username} (${userData.email})`,
        );
        console.log(`  📞 手机: ${userData.phone || '未提供'}`);
        console.log(`  🔒 此账户仅用于联系信息，已禁用登录`);
        successCount++;
      } catch (error: any) {
        console.error(
          `  ❌ 创建联系人记录失败: ${userData.email} - ${error.message}`,
        );
        failCount++;
      }
    }

    // Print statistics
    console.log(`\n=== 导入统计 ===`);
    console.log(`总计: ${usersWithOrgName.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`跳过: ${skipCount}`);
    console.log(`失败: ${failCount}`);
    console.log(`================\n`);

    console.log('联系人导入完成！');
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
用户联系人导入工具

用法:
  tsx scripts/import-users.ts [选项]

选项:
  --dry-run, -d     仅模拟导入，不实际创建数据
  --help, -h        显示帮助信息

环境变量:
  STRAPI_URL        Strapi 服务器地址 (默认: http://localhost:1337)
  STRAPI_TOKEN      Strapi API Token
  EXCEL_FILE        Excel 文件路径 (默认: scripts/教育公益开放式数据库.xlsx)
  SHEET_NAME        工作表名称 (默认: 使用第一个工作表)
  BATCH_SIZE        批次大小 (默认: 10)
  MAX_ROWS          最大导入行数 (默认: 0, 表示导入所有行)
  DRY_RUN           模拟模式 (true/false)

示例:
  # 正常导入
  STRAPI_TOKEN=your_token tsx scripts/import-users.ts
  
  # 模拟导入
  DRY_RUN=true tsx scripts/import-users.ts
  
  # 仅处理前100行
  MAX_ROWS=100 STRAPI_TOKEN=your_token tsx scripts/import-users.ts
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

export { DataTransformer, ExcelReader, StrapiAPI };
