import { OrganizationData, ImportStats } from '../types';
import { StrapiAPI } from './strapi-api';
import { ImportLogger } from './import-logger';

export class DataImporter {
  private api: StrapiAPI;
  public logger: ImportLogger;
  private stats: ImportStats;
  private batchSize: number;
  private dryRun: boolean;

  constructor(api: StrapiAPI, batchSize: number = 10, dryRun: boolean = false) {
    this.api = api;
    this.logger = new ImportLogger();
    this.batchSize = batchSize;
    this.dryRun = dryRun;
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };
  }

  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`开始导入 ${organizations.length} 个组织...`);

    for (let i = 0; i < organizations.length; i += this.batchSize) {
      const batch = organizations.slice(i, i + this.batchSize);
      console.log(
        `处理批次 ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(organizations.length / this.batchSize)}`,
      );

      await this.processBatch(batch);

      // add delay to avoid API limit
      if (i + this.batchSize < organizations.length) {
        await this.delay(1000);
      }
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private printStats(): void {
    console.log('\n=== 导入统计 ===');
    console.log(`总计: ${this.stats.total}`);
    console.log(`成功: ${this.stats.success}`);
    console.log(`失败: ${this.stats.failed}`);
    console.log(`跳过: ${this.stats.skipped}`);
    console.log('================\n');
  }
}
