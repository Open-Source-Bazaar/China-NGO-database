#!/usr/bin/env tsx

/**
 * Simplified refactored Strapi database import script
 * This demonstrates the refactoring approach with minimal dependencies
 */

import * as fs from 'node:fs';

// Import existing utilities - these should work without type issues
const ExcelReader = require('./utils/excel-reader').ExcelReader;
const DataTransformer =
  require('./transformers/data-transformer').DataTransformer;

// Simple types to avoid complex dependencies
interface Config {
  EXCEL_FILE: string;
  SHEET_NAME: string | null;
  MAX_ROWS: number;
  DRY_RUN: boolean;
}

interface OrganizationSource {
  [key: string]: any;
  常用名称?: string;
  机构信用代码?: string;
  实体类型?: string;
}

interface OrganizationTarget {
  id?: number;
  name: string;
  code: string;
  entityType: string;
  [key: string]: any;
}

// Configuration
const CONFIG: Config = {
  EXCEL_FILE: process.env.EXCEL_FILE || '教育公益开放式数据库.xlsx',
  SHEET_NAME: process.env.SHEET_NAME || null,
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '0'),
  DRY_RUN: process.env.DRY_RUN === 'true',
};

/**
 * Simulated MobX-RESTful-migrator pattern
 * This shows how the refactoring would work
 */
class SimpleMigrator {
  private processedCount = 0;
  private successCount = 0;
  private errorCount = 0;

  constructor(
    private dataSource: () => AsyncGenerator<OrganizationSource>,
    private fieldMapping: Record<string, (org: OrganizationSource) => any>,
  ) {}

  async *boot(): AsyncGenerator<OrganizationTarget> {
    console.log('开始迁移...\n');

    for await (const sourceItem of this.dataSource()) {
      this.processedCount++;

      try {
        // Apply the existing transformation logic
        const transformedData = this.applyTransformations(sourceItem);

        // Simulate saving to database (in real version this would use Strapi API)
        const savedItem = await this.saveToDatabase(transformedData);

        this.successCount++;
        this.logSuccess(this.processedCount, sourceItem, savedItem);

        yield savedItem;
      } catch (error: any) {
        this.errorCount++;
        this.logError(this.processedCount, sourceItem, error);
      }
    }

    this.printFinalStats();
  }

  private applyTransformations(
    sourceItem: OrganizationSource,
  ): OrganizationTarget {
    // Use existing DataTransformer logic
    try {
      const transformed = DataTransformer.transformOrganization(sourceItem);
      return {
        name: transformed.name,
        code: transformed.code,
        entityType: transformed.entityType,
        description: transformed.description,
        staffCount: transformed.staffCount,
        // Include other transformed fields
        ...transformed,
      };
    } catch (error) {
      console.warn('使用备用转换逻辑:', error);
      // Fallback transformation
      return {
        name: sourceItem.常用名称 || 'Unknown',
        code: sourceItem.机构信用代码 || '',
        entityType: sourceItem.实体类型 || 'OTHER',
      };
    }
  }

  private async saveToDatabase(
    data: OrganizationTarget,
  ): Promise<OrganizationTarget> {
    // Simulate database save operation
    if (CONFIG.DRY_RUN) {
      return { ...data, id: this.processedCount };
    }

    // In real implementation, this would make actual API calls to Strapi
    // const api = new StrapiAPI(CONFIG.STRAPI_URL, CONFIG.STRAPI_TOKEN);
    // return await api.organizationStore.updateOne(data);

    return { ...data, id: this.processedCount };
  }

  private logSuccess(
    index: number,
    source: OrganizationSource,
    target: OrganizationTarget,
  ) {
    console.log(`✅ [${index}] 成功处理: ${target.name}`);
    console.log(`   源数据: ${source.常用名称} (${source.实体类型})`);
    console.log(`   目标: ID=${target.id}, 类型=${target.entityType}\n`);
  }

  private logError(index: number, source: OrganizationSource, error: Error) {
    console.error(`❌ [${index}] 处理失败: ${source.常用名称}`);
    console.error(`   错误: ${error.message}\n`);
  }

  private printFinalStats() {
    console.log('\n=== 迁移完成统计 ===');
    console.log(`总数: ${this.processedCount}`);
    console.log(`成功: ${this.successCount}`);
    console.log(`失败: ${this.errorCount}`);
    console.log(
      `成功率: ${((this.successCount / this.processedCount) * 100).toFixed(1)}%`,
    );
  }
}

/**
 * Data source generator using existing Excel reader
 */
async function* loadOrganizationData(): AsyncGenerator<OrganizationSource> {
  console.log(`正在读取 Excel 文件: ${CONFIG.EXCEL_FILE}`);

  if (!fs.existsSync(CONFIG.EXCEL_FILE)) {
    console.log('⚠️  Excel 文件不存在，使用演示数据');
    // Use demo data if Excel file doesn't exist
    const demoData = [
      {
        常用名称: '演示基金会',
        机构信用代码: 'DEMO123456789',
        实体类型: '基金会',
        '机构／项目简介': '这是一个演示组织',
      },
      {
        常用名称: '测试协会',
        机构信用代码: 'TEST987654321',
        实体类型: '社会团体',
        '机构／项目简介': '这是另一个演示组织',
      },
    ];

    for (const item of demoData) {
      yield item;
    }
    return;
  }

  try {
    // Use existing Excel reader
    const rawOrganizations = ExcelReader.readExcelFile(
      CONFIG.EXCEL_FILE,
      CONFIG.SHEET_NAME,
    );

    if (CONFIG.MAX_ROWS > 0) {
      rawOrganizations.splice(CONFIG.MAX_ROWS);
    }

    console.log(`从 Excel 读取到 ${rawOrganizations.length} 条记录\n`);

    for (const org of rawOrganizations) {
      yield org;
    }
  } catch (error: any) {
    console.error('Excel 读取失败:', error.message);
    throw error;
  }
}

// Field mapping configuration (simplified version of what would be in MobX-RESTful-migrator)
const fieldMapping = {
  常用名称: (org: OrganizationSource) => ({ name: org.常用名称 }),
  机构信用代码: (org: OrganizationSource) => ({ code: org.机构信用代码 }),
  实体类型: (org: OrganizationSource) => ({ entityType: org.实体类型 }),
};

async function main() {
  try {
    console.log('=== Strapi 数据导入工具 (重构版演示) ===\n');

    if (CONFIG.DRY_RUN) {
      console.log('🔥 DRY RUN 模式 - 不会实际创建数据\n');
    }

    // Create migrator instance
    const migrator = new SimpleMigrator(loadOrganizationData, fieldMapping);

    let processedCount = 0;
    for await (const organization of migrator.boot()) {
      processedCount++;

      if (CONFIG.DRY_RUN && processedCount >= 5) {
        console.log('🔥 DRY RUN 模式限制，仅显示前5个示例\n');
        break;
      }
    }

    console.log('\n🎯 重构说明:');
    console.log('1. 此脚本演示了使用 MobX-RESTful-migrator 的重构方法');
    console.log('2. 保持了现有的 DataTransformer 和 ExcelReader 逻辑');
    console.log('3. 简化了批处理、错误处理和日志记录逻辑');
    console.log('4. 在完整实现中将使用真实的 Strapi API 调用');
  } catch (error: any) {
    console.error('导入失败:', error.message);
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
重构版数据导入工具演示

用法:
  tsx scripts/import-refactored-simple.ts [选项]

选项:
  --dry-run, -d     仅模拟导入，不实际创建数据
  --help, -h        显示帮助信息

环境变量:
  EXCEL_FILE        Excel 文件路径
  SHEET_NAME        工作表名称
  MAX_ROWS          最大处理行数 (0 = 全部)
  DRY_RUN           模拟运行 (true/false)

示例:
  # 运行演示
  DRY_RUN=true tsx scripts/import-refactored-simple.ts
`);
    process.exit(0);
  }

  if (args.includes('--dry-run') || args.includes('-d')) {
    CONFIG.DRY_RUN = true;
  }
}

if (require.main === module) {
  parseArgs();
  main();
}

export { SimpleMigrator, loadOrganizationData };
