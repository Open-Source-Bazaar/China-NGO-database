import { splitArray, sleep } from 'web-utility';
import { randomBytes } from 'node:crypto';

import { OrganizationData, ImportStats, ExtendedUserData } from '../types';
import { Organization, StrapiAPI } from './strapi-api';
import { ImportLogger } from './import-logger';

// Type guard function
const hasId = (
  user: ExtendedUserData | null | undefined,
): user is ExtendedUserData & { id: number } =>
  !!(
    user &&
    typeof user.id === 'number' &&
    Number.isInteger(user.id) &&
    user.id > 0
  );

export class DataImporter {
  public logger: ImportLogger;
  private stats: ImportStats;
  private userCache: Map<string, number>;

  constructor(
    private api: StrapiAPI,
    private userWeakMap: WeakMap<OrganizationData, ExtendedUserData>,
    private batchSize: number = 10,
    private batchDelay: number = 0,
    private dryRun: boolean = false,
  ) {
    this.logger = new ImportLogger();
    this.stats = { total: 0, success: 0, failed: 0, skipped: 0 };
    this.userCache = new Map();
  }

  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`开始导入 ${organizations.length} 个组织...`);

    const batches = splitArray(organizations, this.batchSize);

    for (const [i, batch] of batches.entries()) {
      console.log(`处理批次 ${i + 1}/${batches.length}`);

      await this.processBatch(batch);

      // Add delay to reduce concurrent pressure
      if (i < batches.length - 1 && this.batchDelay > 0) {
        console.log(`等待 ${this.batchDelay}s 避免并发压力...`);
        await sleep(this.batchDelay * 1000); // web-utility's sleep uses milliseconds
      }
    }

    this.printStats();
    await this.logger.saveToFiles();
  }

  private async processBatch(organizations: OrganizationData[]): Promise<void> {
    // Use small cache to avoid memory issues
    const smallCache = new Set<string>();

    for (const org of organizations) {
      this.stats.total++;

      const rawName = org.name ?? '';
      const nameKey = rawName.trim(); // display name to persist
      const cacheKey = nameKey.toLowerCase(); // dedupe key
      if (!nameKey) {
        console.log(`跳过无名称的组织`);
        await this.logger.logSkipped(org, '无名称');
        this.stats.skipped++;
        continue;
      }

      // Check small cache
      if (smallCache.has(cacheKey)) {
        console.log(`跳过批次内重复: ${nameKey}`);
        await this.logger.logSkipped(org, '批次内重复');
        this.stats.skipped++;
        continue;
      }

      // Check if already exists in database (avoid large memory cache)
      let existing: Organization | undefined;
      try {
        [existing] = await this.api.organizationStore.getList({
          name: nameKey,
        });
      } catch (error: any) {
        console.error(
          `查重请求失败: ${nameKey}`,
          error?.message || String(error),
        );
        await this.logger.logFailed(org, error);
        this.stats.failed++;
        continue;
      }

      if (existing) {
        console.log(`跳过已存在的组织: ${nameKey}`);
        await this.logger.logSkipped(org, '组织已存在');
        this.stats.skipped++;
        smallCache.add(cacheKey); // Add to small cache
        continue;
      }

      // Create new organization
      try {
        if (this.dryRun) {
          console.log(`[DRY RUN] 将创建组织: ${nameKey}`);
          this.stats.success++;
          smallCache.add(cacheKey);
          continue;
        }

        // Clean data and trim name whitespace
        const cleanOrgData: OrganizationData = { ...org, name: nameKey };

        // Get user data from WeakMap
        let userData = this.userWeakMap.get(org);

        // If user data exists, create user and associate
        if (userData) {
          try {
            // Validate user data
            if (!userData.email || !userData.username) {
              throw new Error('用户数据缺少必需字段：email 或 username');
            }

            // Normalize username: trim, strip disallowed chars, cap length; fallback to email local-part
            userData.username = userData.username
              .trim()
              .replace(/[｜（）()【】\[\]{}"'`]/g, '');
            if (!userData.username) {
              const local = userData.email.trim().toLowerCase().split('@')[0];
              userData.username =
                local.slice(0, 50) || `user_${randomBytes(6).toString('hex')}`;
            }

            userData.username = userData.username.slice(0, 50);

            // Check if user already exists in memory cache
            const emailKey = userData.email.trim().toLowerCase();
            const usernameKey = userData.username.trim().toLowerCase();

            // Check if user already exists in cache
            let userId =
              this.userCache.get(emailKey) || this.userCache.get(usernameKey);

            if (!userId) {
              // Create new user if not found
              userData.password ||= randomBytes(18)
                .toString('base64url')
                .slice(0, 24);

              const createdUser = await this.api.userStore.updateOne(userData);

              console.log(`✓ 成功创建联系人用户: ${userData.username}`);

              if (!hasId(createdUser)) {
                throw new Error(`创建的用户缺少ID: ${userData.username}`);
              }
              userId = createdUser.id;
            } else {
              console.log(`✓ 使用现有用户: ${userData.username}`);
            }

            // Cache both keys for future lookups
            this.userCache.set(emailKey, userId);
            this.userCache.set(usernameKey, userId);

            // Set organization-user association
            cleanOrgData.contactUser = userId;
          } catch (userError: unknown) {
            console.error(
              `✗ 用户创建失败: ${userData?.username || 'unknown'} (组织: ${org.name})`,
            );

            // Log user creation failure to user failed log, but don't prevent organization creation
            const failedOrgForLog = {
              ...org,
              name: `${org.name} (用户名: ${userData.username})`,
            };
            await this.logger.logUserFailed(
              failedOrgForLog,
              userError as Error,
            );
            this.stats.failed++;
            cleanOrgData.contactUser = null; // Set to null, continue with organization creation
          }
        } else {
          // If no contact user, set to null
          cleanOrgData.contactUser = null;
        }

        await this.api.organizationStore.updateOne(cleanOrgData);

        console.log(`✓ 成功创建组织: ${nameKey}`);
        this.stats.success++;
        smallCache.add(cacheKey);
      } catch (error: any) {
        console.error(`✗ 创建组织失败: ${nameKey}`, error.message);

        // 记录组织创建失败
        const failedOrgForLog = {
          ...org,
          name: `${org.name}`,
        };
        await this.logger.logFailed(failedOrgForLog, error);
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
