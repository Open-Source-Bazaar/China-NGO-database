import { splitArray } from 'web-utility';

import { OrganizationData, ImportStats, ExtendedUserData } from '../types';
import { StrapiAPI } from './strapi-api';
import { ImportLogger } from './import-logger';

// 类型守卫函数
function hasId(
  user: ExtendedUserData | null | undefined,
): user is ExtendedUserData & { id: number } {
  return user !== null && user !== undefined && typeof user.id === 'number';
}

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
        const cleanOrgData: OrganizationData = { ...org };
        // 使用类型断言安全地移除内部字段
        if ('_originalData' in cleanOrgData) {
          delete (
            cleanOrgData as OrganizationData & { _originalData?: unknown }
          )._originalData;
        }

        // 获取用户数据（从 _userData 属性）
        let userData: ExtendedUserData | undefined;
        if ('_userData' in org) {
          userData = (
            org as OrganizationData & { _userData?: ExtendedUserData }
          )._userData;
        }

        // 如果有用户数据，创建用户并关联
        if (userData) {
          try {
            // 验证用户数据
            if (!userData.email || !userData.username) {
              throw new Error('用户数据缺少必需字段：email 或 username');
            }

            // 预验证用户名长度（Strapi通常限制50字符）
            if (userData.username.length > 50) {
              console.warn(
                `⚠️ 用户名过长(${userData.username.length}字符)，跳过用户创建: ${userData.username}`,
              );
              // 记录到日志，方便后续检查
              const failedOrgForLog = {
                ...org,
                name: `[用户名过长] ${org.name} (用户名: ${userData.username})`,
              };
              this.logger.logSkipped(
                failedOrgForLog,
                `用户名过长(${userData.username.length}字符)`,
              );
              cleanOrgData.contactUser = null;
            } else if (/[｜（）()【】\[\]{}"'`]/.test(userData.username)) {
              console.warn(
                `⚠️ 用户名包含特殊字符，跳过用户创建: ${userData.username}`,
              );
              // 记录到日志，方便后续检查
              const failedOrgForLog = {
                ...org,
                name: `[用户名特殊字符] ${org.name} (用户名: ${userData.username})`,
              };
              this.logger.logSkipped(failedOrgForLog, '用户名包含特殊字符');
              cleanOrgData.contactUser = null;
            } else {
              // 检查用户是否已存在
              const existingUser = await this.api.findUserByEmail(
                userData.email,
              );
              let userId: number;

              if (hasId(existingUser)) {
                console.log(`✓ 使用现有用户: ${userData.username}`);
                userId = existingUser.id;
              } else {
                const createdUser = await this.api.createUser(userData);
                console.log(`✓ 成功创建联系人用户: ${userData.username}`);

                // 验证创建的用户有ID
                if (!hasId(createdUser)) {
                  throw new Error(`创建的用户缺少ID: ${userData.username}`);
                }
                userId = createdUser.id;
              }

              // 设置组织与用户的关联
              cleanOrgData.contactUser = userId;
            }
          } catch (userError: unknown) {
            console.error(
              `✗ 用户创建失败: ${userData?.username || 'unknown'} (组织: ${org.name})`,
            );

            // 记录用户创建失败到用户失败日志，但不阻止组织创建
            const failedOrgForLog = {
              ...org,
              name: `${org.name} (用户名: ${userData.username})`,
            };
            this.logger.logUserFailed(failedOrgForLog, userError as Error);
            this.stats.failed++;
            cleanOrgData.contactUser = null; // 设置为null，继续创建组织
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

        // 记录组织创建失败
        const failedOrgForLog = {
          ...org,
          name: `${org.name}`,
        };
        this.logger.logFailed(failedOrgForLog, error);
        this.stats.failed++;
      }
    }
  }

  private printStats() {
    const { total, success, failed, skipped } = this.stats;
    const loggerSummary = this.logger.getSummary();

    console.log(`
=== 导入统计 ===
总计: ${total}
成功: ${success}
失败: ${failed}
  - 组织失败: ${loggerSummary.orgFailed}
  - 用户失败: ${loggerSummary.userFailed}
跳过: ${skipped}
================
`);
  }
}
