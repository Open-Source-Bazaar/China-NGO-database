import { sleep, splitArray } from 'web-utility';

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

      // add delay to avoid API limit
      if (i < batches.length) await sleep(1);
    }

    this.printStats();
    this.logger.saveToFiles();
  }

  private async processBatch(organizations: OrganizationData[]): Promise<void> {
    const promises = organizations.map((org) => this.processOrganization(org));

    await Promise.allSettled(promises);
  }

  private async processOrganization(orgData: OrganizationData): Promise<void> {
    try {
      this.stats.total++;

      // check if organization already exists
      if (orgData.name) {
        const existing = await this.api.findOrganizationByName(orgData.name);
        if (existing) {
          console.log(`跳过已存在的组织: ${orgData.name}`);
          this.logger.logSkipped(orgData, '组织已存在');
          this.stats.skipped++;
          return;
        }
      }
      if (this.dryRun) {
        console.log(`[DRY RUN] 将创建组织: ${orgData.name}`);
        this.stats.success++;
        return;
      }
      // create organization
      await this.api.createOrganization(orgData);
      console.log(`✓ 成功创建组织: ${orgData.name}`);
      this.stats.success++;
    } catch (error: any) {
      console.error(`✗ 创建组织失败: ${orgData.name}`, error.message);
      this.logger.logFailed(orgData, error);
      this.stats.failed++;
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
