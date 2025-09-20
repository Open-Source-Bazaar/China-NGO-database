#!/usr/bin/env tsx

/**
 * Demo script showing how to refactor data import using MobX-RESTful-migrator
 * This demonstrates the approach without complex type dependencies
 */

console.log('=== 数据导入脚本重构演示 ===\n');

// Simulate the refactoring approach
interface SourceOrg {
  常用名称?: string;
  机构信用代码?: string;
  实体类型?: string;
  '机构／项目简介'?: string;
}

interface TargetOrg {
  id: number;
  name: string;
  code: string;
  entityType: string;
  description: string;
}

// Mock data source (would be Excel in real implementation)
const mockSourceData: SourceOrg[] = [
  {
    常用名称: '示例教育基金会',
    机构信用代码: '12345678901234567X',
    实体类型: '基金会',
    '机构／项目简介': '致力于教育公益事业发展',
  },
  {
    常用名称: '环保行动组织',
    机构信用代码: '98765432109876543Y',
    实体类型: '社会团体',
    '机构／项目简介': '专注于环境保护和可持续发展',
  },
];

// Simulated migration using MobX-RESTful-migrator pattern
class MockMigrator {
  constructor(
    private dataSource: () => AsyncGenerator<SourceOrg>,
    private mapping: any,
  ) {}

  async *boot() {
    let index = 0;
    for await (const sourceItem of this.dataSource()) {
      index++;

      console.log(`Processing item ${index}: ${sourceItem.常用名称}`);

      // Apply field mappings (simulated)
      const targetItem: TargetOrg = {
        id: index,
        name: sourceItem.常用名称 || '',
        code: sourceItem.机构信用代码 || '',
        entityType: this.transformEntityType(sourceItem.实体类型),
        description: sourceItem['机构／项目简介'] || '',
      };

      console.log(
        `✅ Transformed: ${targetItem.name} (${targetItem.entityType})`,
      );

      yield targetItem;
    }
  }

  private transformEntityType(entityType?: string): string {
    const mapping: Record<string, string> = {
      基金会: 'FOUNDATION',
      社会团体: 'SOCIAL_ORGANIZATION',
      民办非企业单位: 'PRIVATE_NON_ENTERPRISE',
    };
    return mapping[entityType || ''] || 'OTHER';
  }
}

// Data source generator
async function* loadData(): AsyncGenerator<SourceOrg> {
  console.log('Loading mock data...\n');
  for (const item of mockSourceData) {
    yield item;
  }
}

// Migration schema (simulated MobX-RESTful-migrator format)
const migrationMapping = {
  常用名称: ({ 常用名称 }: SourceOrg) => ({
    name: { value: 常用名称 || '' },
  }),
  机构信用代码: ({ 机构信用代码 }: SourceOrg) => ({
    code: { value: 机构信用代码 || '' },
  }),
  // ... more mappings would be defined here
};

// Main demonstration
async function main() {
  const migrator = new MockMigrator(loadData, migrationMapping);

  console.log('开始数据迁移演示...\n');

  let count = 0;
  for await (const organization of migrator.boot()) {
    count++;
    console.log(`Result ${count}:`, JSON.stringify(organization, null, 2));
    console.log('---\n');
  }

  console.log(`演示完成！处理了 ${count} 个组织\n`);

  console.log('🎯 重构要点:');
  console.log('1. 使用 MobX-RESTful-migrator 替代自定义 DataImporter');
  console.log('2. 将现有的 DataTransformer 逻辑转换为 MigrationSchema 格式');
  console.log('3. 利用框架的内置日志和错误处理功能');
  console.log('4. 保持现有的转换逻辑，但使用标准化的迁移框架');
  console.log('5. 减少自定义代码，提高可维护性\n');

  console.log('📁 需要创建的文件:');
  console.log(
    '- scripts/models/strapi-models.ts (MobX-RESTful compatible models)',
  );
  console.log('- scripts/migration/organization-mapping.ts (Migration schema)');
  console.log('- scripts/import-data-refactored.ts (New main script)');
}

if (require.main === module) {
  main().catch(console.error);
}

export { MockMigrator, loadData, migrationMapping };
