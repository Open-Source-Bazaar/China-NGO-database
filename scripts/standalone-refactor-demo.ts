#!/usr/bin/env tsx

/**
 * Standalone refactored import script demo
 * Shows the complete refactoring approach without dependencies issues
 */

import * as fs from 'node:fs';

// Mock the existing functionality to demonstrate the refactoring
console.log('=== 数据导入脚本重构演示 ===\n');

interface SourceData {
  常用名称?: string;
  机构信用代码?: string;
  实体类型?: string;
  注册国籍?: string;
  '机构／项目简介'?: string;
  '机构／项目全职人数'?: string | number;
  注册地?: string;
  机构官网?: string;
  负责人?: string;
  机构联系人联系人姓名?: string;
  机构联系人联系人电话?: string;
  机构联系人联系人邮箱?: string;
}

interface TargetData {
  id?: number;
  name: string;
  code: string;
  entityType: string;
  registrationCountry: string;
  description: string;
  staffCount: number;
  address?: any;
  services?: any;
  internetContact?: any;
  qualifications?: any;
  contactUser?: number | null;
}

// Simulated MobX-RESTful-migrator approach
class RefactoredMigrator {
  private stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  constructor(
    private dataSource: () => AsyncGenerator<SourceData>,
    private fieldMapping: any,
  ) {}

  async *boot() {
    console.log('使用 MobX-RESTful-migrator 模式开始迁移...\n');

    for await (const sourceItem of this.dataSource()) {
      this.stats.total++;

      try {
        // Apply field mappings using the new approach
        const targetItem = await this.applyFieldMappings(sourceItem);

        // Simulate database operation
        const savedItem = await this.saveToDatabase(targetItem);

        this.stats.success++;
        console.log(`✅ [${this.stats.total}] 成功: ${savedItem.name}`);

        yield savedItem;
      } catch (error: any) {
        this.stats.failed++;
        console.error(
          `❌ [${this.stats.total}] 失败: ${sourceItem.常用名称} - ${error.message}`,
        );
      }
    }

    this.printStats();
  }

  private async applyFieldMappings(source: SourceData): Promise<TargetData> {
    // Simulate the field mapping approach from MobX-RESTful-migrator
    const result: Partial<TargetData> = {};

    // Apply transformations (using the same logic as existing DataTransformer)
    result.name = source.常用名称 || '';
    result.code = source.机构信用代码 || '';
    result.entityType = this.transformEntityType(source.实体类型);
    result.registrationCountry = this.transformRegistrationCountry(
      source.注册国籍,
    );
    result.description = this.cleanDescription(source['机构／项目简介']);
    result.staffCount = this.parseStaffCount(source['机构／项目全职人数']);

    // Complex transformations (simulated)
    result.address = this.transformAddress(source);
    result.services = this.transformServices(source);
    result.internetContact = this.transformContacts(source);

    // Cross-table relationship (User creation)
    if (source.机构联系人联系人姓名) {
      result.contactUser = await this.createContactUser(source);
    }

    return result as TargetData;
  }

  private transformEntityType(entityType?: string): string {
    const mapping: Record<string, string> = {
      基金会: 'FOUNDATION',
      社会团体: 'SOCIAL_ORGANIZATION',
      民办非企业单位: 'PRIVATE_NON_ENTERPRISE',
      国际组织: 'INTERNATIONAL',
    };
    return mapping[entityType || ''] || 'OTHER';
  }

  private transformRegistrationCountry(country?: string): string {
    return country?.includes('国际') ? 'INTERNATIONAL' : 'CHINA';
  }

  private cleanDescription(desc?: string): string {
    return desc?.replace(/\s+/g, ' ').trim().slice(0, 2000) || '';
  }

  private parseStaffCount(staff?: string | number): number {
    if (typeof staff === 'number') return staff;
    const match = staff?.toString().match(/(\\d+)-(\\d+)/);
    if (match) {
      const [, start, end] = match;
      return Math.floor((parseInt(start) + parseInt(end)) / 2);
    }
    return parseInt(staff?.toString() || '0') || 0;
  }

  private transformAddress(source: SourceData) {
    // Simulated address transformation
    return {
      province: this.extractProvince(source.注册地),
      city: this.extractCity(source.注册地),
      street: source.注册地 || '',
    };
  }

  private transformServices(source: SourceData) {
    // Simulated services transformation
    return source.机构官网 ? [{ type: 'website', url: source.机构官网 }] : [];
  }

  private transformContacts(source: SourceData) {
    // Simulated contact transformation
    return {
      website: source.机构官网 || null,
      principalName: source.负责人 || null,
    };
  }

  private async createContactUser(source: SourceData): Promise<number | null> {
    const contactName = source.机构联系人联系人姓名;
    const contactPhone = source.机构联系人联系人电话;
    const contactEmail = source.机构联系人联系人邮箱;

    if (!contactName && !contactPhone && !contactEmail) {
      return null;
    }

    // Simulate user creation (would use UserModel in real implementation)
    const userId = Math.floor(Math.random() * 10000) + 1;
    console.log(`   📞 创建联系人用户: ${contactName} (ID: ${userId})`);

    return userId;
  }

  private extractProvince(address?: string): string {
    if (!address) return '';
    const provinces = [
      '北京市',
      '上海市',
      '天津市',
      '重庆市',
      '广东省',
      '江苏省',
      '浙江省',
    ];
    for (const province of provinces) {
      if (address.includes(province)) return province;
    }
    return '';
  }

  private extractCity(address?: string): string {
    // Simplified city extraction
    return address?.split('市')[0] + '市' || '';
  }

  private async saveToDatabase(data: TargetData): Promise<TargetData> {
    // Simulate API call to Strapi
    return { ...data, id: this.stats.total };
  }

  private printStats() {
    console.log('\\n=== 迁移统计 ===');
    console.log(`总数: ${this.stats.total}`);
    console.log(`成功: ${this.stats.success}`);
    console.log(`失败: ${this.stats.failed}`);
    console.log(`跳过: ${this.stats.skipped}`);
    console.log(
      `成功率: ${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`,
    );
  }
}

// Mock data source
async function* loadMockData(): AsyncGenerator<SourceData> {
  const mockData: SourceData[] = [
    {
      常用名称: '爱心教育基金会',
      机构信用代码: '12345678901234567A',
      实体类型: '基金会',
      注册国籍: '中国',
      '机构／项目简介':
        '致力于改善贫困地区教育状况的公益基金会，成立于2010年。',
      '机构／项目全职人数': '15-25',
      注册地: '北京市朝阳区建国路88号',
      机构官网: 'https://example-education.org',
      负责人: '张三',
      机构联系人联系人姓名: '李四',
      机构联系人联系人电话: '13800138000',
      机构联系人联系人邮箱: 'contact@example-education.org',
    },
    {
      常用名称: '绿色环保协会',
      机构信用代码: '98765432109876543B',
      实体类型: '社会团体',
      注册国籍: '中国',
      '机构／项目简介': '专注于环境保护和生态修复的非营利组织。',
      '机构／项目全职人数': '8',
      注册地: '上海市浦东新区世纪大道100号',
      机构官网: 'https://green-action.org',
      负责人: '王五',
      机构联系人联系人姓名: '赵六',
      机构联系人联系人电话: '13900139000',
      机构联系人联系人邮箱: 'info@green-action.org',
    },
    {
      常用名称: '国际发展合作中心',
      机构信用代码: '11111111111111111C',
      实体类型: '国际组织',
      注册国籍: '国际组织',
      '机构／项目简介': '促进国际间发展合作与交流的平台。',
      '机构／项目全职人数': '50-100',
      注册地: '北京市东城区王府井大街1号',
      负责人: '国际主任',
    },
  ];

  console.log('加载演示数据...\\n');
  for (const item of mockData) {
    yield item;
  }
}

// Migration schema (simulated MobX-RESTful-migrator format)
const migrationSchema = {
  常用名称: (source: SourceData) => ({
    name: { value: source.常用名称 || '' },
  }),
  机构信用代码: (source: SourceData) => ({
    code: { value: source.机构信用代码 || '' },
  }),
  // Additional mappings would be defined here in real implementation
};

async function main() {
  const isDryRun =
    process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  if (isDryRun) {
    console.log('🔥 DRY RUN 模式\\n');
  }

  const migrator = new RefactoredMigrator(loadMockData, migrationSchema);

  let processedCount = 0;
  for await (const result of migrator.boot()) {
    processedCount++;

    if (isDryRun && processedCount >= 3) {
      console.log('\\n🔥 DRY RUN 模式限制，仅显示前3个示例');
      break;
    }
  }

  console.log('\\n🎯 重构对比:\\n');
  console.log('原始方案：');
  console.log('- 自定义 DataImporter 类');
  console.log('- 手动批处理和错误处理');
  console.log('- 自定义日志系统');
  console.log('- 复杂的用户关系处理');
  console.log('');
  console.log('重构后（使用 MobX-RESTful-migrator）：');
  console.log('- 标准化的 RestMigrator 框架');
  console.log('- 声明式的字段映射配置');
  console.log('- 内置的事件处理和日志系统');
  console.log('- 简化的跨表关系处理');
  console.log('- 更好的可维护性和扩展性');
}

if (require.main === module) {
  main().catch(console.error);
}
