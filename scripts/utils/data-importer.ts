import { splitArray } from 'web-utility';

import { OrganizationData, ImportStats } from '../types';
import { StrapiAPI } from './strapi-api';
import { ImportLogger } from './import-logger';

export class DataImporter {
  public logger: ImportLogger;
  private stats: ImportStats;

  constructor(
    private api: StrapiAPI,
    private batchSize: number = 10,
    private dryRun: boolean = false,
  ) {
    this.logger = new ImportLogger();
    this.stats = { total: 0, success: 0, failed: 0, skipped: 0 };
  }

  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`开始导入 ${organizations.length} 个组织...`);

    const batches = splitArray(organizations, this.batchSize);

    for (const [i, batch] of batches.entries()) {
      console.log(`处理批次 ${i + 1}/${batches.length}`);

      await this.processBatch(batch);

      // // 增加延迟降低并发压力
      // if (i < batches.length - 1) {
      //   console.log('等待 2s 避免并发压力...');
      //   await sleep(1); // 1秒延迟
      // }
    }

    this.printStats();
    this.logger.saveToFiles();
  }

  private async processBatch(organizations: OrganizationData[]): Promise<void> {
    // 使用小型缓存避免内存问题
    const smallCache = new Set<string>();

    for (const org of organizations) {
      this.stats.total++;

      if (!org.name) {
        console.log(`跳过无名称的组织`);
        this.logger.logSkipped(org, '无名称');
        this.stats.skipped++;
        continue;
      }
      const nameKey = org.name.trim();

      // 检查小型缓存
      if (smallCache.has(nameKey)) {
        console.log(`跳过批次内重复: ${nameKey}`);
        this.logger.logSkipped(org, '批次内重复');
        this.stats.skipped++;
        continue;
      }

      // 检查数据库中是否已存在（避免大内存缓存）
      const existing = await this.api.findOrganizationByName(nameKey);
      if (existing) {
        console.log(`跳过已存在的组织: ${nameKey}`);
        this.logger.logSkipped(org, '组织已存在');
        this.stats.skipped++;
        smallCache.add(nameKey); // 添加到小型缓存
        continue;
      }

      // 创建新组织
      try {
        if (this.dryRun) {
          console.log(`[DRY RUN] 将创建组织: ${nameKey}`);
          this.stats.success++;
          smallCache.add(nameKey);
          continue;
        }

        // 清理数据，移除内部字段
        const cleanOrgData = { ...org };
        delete (cleanOrgData as any)._originalData;

        // 如果有联系人用户，先创建用户
        if (cleanOrgData.contactUser) {
          try {
            // 验证用户数据
            const contactUser = cleanOrgData.contactUser as any;
            if (!contactUser.email || !contactUser.username) {
              throw new Error('用户数据缺少必需字段：email 或 username');
            }

            // 检查用户是否已存在
            const existingUser = await this.api.findUserByEmail(
              contactUser.email,
            );
            if (existingUser) {
              console.log(`✓ 使用现有用户: ${contactUser.username}`);
              cleanOrgData.contactUser = (existingUser as any).id;
            } else {
              const createdUser = await this.api.createUser(contactUser);
              console.log(`✓ 成功创建联系人用户: ${contactUser.username}`);

              // 设置组织与用户的关联
              const userId = (createdUser as any).id;
              if (!userId) {
                throw new Error(`创建的用户缺少ID: ${contactUser.username}`);
              }
              cleanOrgData.contactUser = userId;
            }
          } catch (userError: any) {
            const username =
              (cleanOrgData.contactUser as any)?.username || 'unknown';
            console.error(`✗ 用户操作失败: ${username}`, userError.message);
            this.logger.logFailed(org, userError);
            this.stats.failed++;
            continue;
          }
        } else {
          // 如果没有联系人用户，设置为null
          cleanOrgData.contactUser = null;
        }

        await this.api.createOrganization(cleanOrgData);
        console.log(`✓ 成功创建组织: ${nameKey}`);
        this.stats.success++;
        smallCache.add(nameKey);
      } catch (error: any) {
        console.error(`✗ 创建组织失败: ${nameKey}`, error.message);
        this.logger.logFailed(org, error);
        this.stats.failed++;
      }
    }
  }

  private printStats() {
    const { total, success, failed, skipped } = this.stats;

    console.log(`
=== 导入统计 ===
总计: ${total}
成功: ${success}
失败: ${failed}
跳过: ${skipped}
================
`);
  }
}
