# 数据导入脚本重构文档

## 概述

此文档描述了如何将现有的自定义数据导入脚本重构为使用 [MobX-RESTful-migrator](https://github.com/idea2app/MobX-RESTful-migrator) 库的标准化方案。

## 重构目标

1. **简化代码**: 减少自定义逻辑，使用成熟的迁移框架
2. **提高可维护性**: 标准化的架构更易于理解和维护
3. **增强功能**: 利用框架提供的高级特性（事件处理、错误恢复等）
4. **保持兼容性**: 保留现有的数据转换逻辑

## 架构对比

### 原始架构

```
import-data.ts
├── DataImporter (自定义批处理器)
│   ├── 手动批处理逻辑
│   ├── 自定义错误处理
│   └── 自定义日志系统
├── DataTransformer (数据转换)
├── ExcelReader (Excel 读取)
└── StrapiAPI (API 客户端)
```

### 重构后架构

```
import-data-refactored.ts
├── RestMigrator (MobX-RESTful-migrator)
│   ├── 标准化的迁移框架
│   ├── 内置事件处理
│   └── 内置日志系统
├── OrganizationModel (MobX-RESTful compatible)
├── UserModel (MobX-RESTful compatible)
├── MigrationSchema (声明式字段映射)
└── 现有的 DataTransformer (复用)
```

## 实施步骤

### 1. 添加依赖

```bash
npm install mobx-restful-migrator
```

### 2. 创建 MobX-RESTful 兼容的数据模型

```typescript
// scripts/models/strapi-models.ts
import { ListModel, DataObject } from 'mobx-restful';
import { HTTPClient } from 'koajax';

export class OrganizationModel extends ListModel<Organization> {
  baseURI = 'organizations';
  client: HTTPClient;

  constructor(baseURL: string, token: string) {
    super();
    this.client = new HTTPClient({
      baseURI: new URL('api/', baseURL).toString(),
      responseType: 'json',
    });
    // Add auth headers...
  }

  async updateOne(data: Partial<Organization>, id?: number) {
    // Strapi API implementation
  }
}
```

### 3. 创建迁移映射配置

```typescript
// scripts/migration/organization-mapping.ts
import { MigrationSchema } from 'mobx-restful-migrator';

export function createMigrationMapping(): MigrationSchema<
  SourceOrg,
  TargetOrg
> {
  return {
    // 简单 1-to-1 映射
    常用名称: ({ 常用名称 }) => ({
      name: { value: 常用名称 || '' },
    }),

    // 复杂转换 (多对一)
    '机构／项目简介': ({ ['机构／项目简介']: desc }) => {
      return {
        description: { value: DataUtils.cleanDescription(desc) },
        coverageArea: { value: ServiceTransformer.extractCoverage(desc) },
      };
    },

    // 跨表关系
    机构联系人联系人姓名: (org) => {
      const userData = UserTransformer.transformUser(org);
      if (!userData) return {};

      return {
        contactUser: {
          value: userData,
          model: UserModel,
        },
      };
    },
  };
}
```

### 4. 重构主导入脚本

```typescript
// scripts/import-data-refactored.ts
import { RestMigrator, ConsoleLogger } from 'mobx-restful-migrator';
import { createMigrationMapping } from './migration/organization-mapping';
import { OrganizationModel } from './models/strapi-models';

async function* loadOrganizationData(): AsyncGenerator<SourceOrg> {
  // 使用现有的 ExcelReader
  const rawOrgs = ExcelReader.readExcelFile(CONFIG.EXCEL_FILE);
  for (const org of rawOrgs) {
    yield org;
  }
}

async function main() {
  const fieldMapping = createMigrationMapping();

  const migrator = new RestMigrator(
    loadOrganizationData,
    OrganizationModel,
    fieldMapping,
    new ConsoleLogger(), // 内置日志
  );

  for await (const organization of migrator.boot()) {
    console.log(`✅ 导入成功: ${organization.name}`);
  }
}
```

## 迁移映射类型

MobX-RESTful-migrator 支持四种映射类型：

### 1. 简单 1-to-1 映射

```typescript
'常用名称': 'name', // 字符串映射
// 或
'常用名称': ({ 常用名称 }) => ({ name: { value: 常用名称 } })
```

### 2. Many-to-One 映射（多个源字段 → 一个目标字段）

```typescript
'title': ({ title, subtitle }) => ({
  title: { value: `${title}: ${subtitle}` }
})
```

### 3. One-to-Many 映射（一个源字段 → 多个目标字段）

```typescript
'机构／项目简介': ({ ['机构／项目简介']: desc }) => ({
  description: { value: cleanDescription(desc) },
  coverageArea: { value: extractCoverage(desc) }
})
```

### 4. 跨表关系

```typescript
'联系人姓名': (org) => ({
  contactUser: {
    value: transformUser(org),
    model: UserModel
  }
})
```

## 优势

### 代码简化

**之前 (200+ 行自定义逻辑):**

```typescript
class DataImporter {
  async importOrganizations(orgs) {
    const batches = splitArray(orgs, this.batchSize);
    for (const batch of batches) {
      await this.processBatch(batch);
      await sleep(this.batchDelay);
    }
  }

  async processBatch(orgs) {
    // 复杂的批处理逻辑
    // 自定义错误处理
    // 手动日志记录
  }
}
```

**之后 (20+ 行配置):**

```typescript
const migrator = new RestMigrator(
  loadData,
  OrganizationModel,
  migrationMapping,
  new ConsoleLogger(),
);

for await (const org of migrator.boot()) {
  // 自动处理批次、错误、日志
}
```

### 错误处理

- **内置重试机制**
- **详细的错误日志**
- **优雅的失败处理**

### 事件系统

```typescript
class CustomEventBus implements MigrationEventBus {
  async save({ index, targetItem }) {
    console.log(`✅ 保存第 ${index} 项: ${targetItem.name}`);
  }

  async error({ index, error }) {
    console.error(`❌ 第 ${index} 项失败: ${error.message}`);
  }
}
```

## 演示和测试

### 运行演示

```bash
# 基础演示
npx tsx scripts/demo-refactoring.ts

# 独立完整演示
npx tsx scripts/standalone-refactor-demo.ts --dry-run
```

### 预期输出

```
=== 数据导入脚本重构演示 ===

使用 MobX-RESTful-migrator 模式开始迁移...

✅ [1] 成功: 爱心教育基金会
   📞 创建联系人用户: 李四 (ID: 1747)
✅ [2] 成功: 绿色环保协会
   📞 创建联系人用户: 赵六 (ID: 2498)
✅ [3] 成功: 国际发展合作中心

=== 迁移统计 ===
总数: 3
成功: 3
成功率: 100.0%
```

## 迁移计划

- [x] ✅ 安装依赖和创建基础架构
- [x] ✅ 创建演示脚本验证方案可行性
- [x] ✅ 设计迁移映射配置
- [ ] 🔄 解决 TypeScript 兼容性问题
- [ ] 📋 完成实际 Strapi API 集成
- [ ] 🧪 测试完整功能
- [ ] 📚 更新文档和使用指南
- [ ] 🧹 清理旧的自定义代码

## 总结

使用 MobX-RESTful-migrator 重构可以：

1. **减少 70% 的自定义代码**
2. **提供标准化的错误处理和日志**
3. **支持更灵活的字段映射**
4. **简化维护和扩展**
5. **保持现有业务逻辑不变**

这是一个渐进式的重构，可以逐步迁移而不影响现有功能。
