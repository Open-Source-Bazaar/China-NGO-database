#!/usr/bin/env tsx

/**
 * Strapi database import script
 * support import NGO organization data from Excel file to Strapi database
 */

import * as XLSX from 'xlsx';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ENTITY_TYPE_MAPPING,
  SERVICE_CATEGORY_MAPPING,
  EDUCATION_FIELDS,
  TARGET_GROUP_FIELDS,
  QUALIFICATION_INDICATORS,
  COVERAGE_KEYWORDS,
  DEFAULTS,
  DATE_PATTERNS,
  LOG_CONSTANTS,
  SERVICE_STATUS,
  QUALIFICATION_TYPES,
  COUNTRIES,
} from './constants';

// Types
interface Config {
  STRAPI_URL: string;
  STRAPI_TOKEN: string;
  EXCEL_FILE: string;
  SHEET_NAME: string | null;
  BATCH_SIZE: number;
  DRY_RUN: boolean;
  MAX_ROWS: number;
}

interface Address {
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string;
  floor?: string;
  room?: string;
}

interface Service {
  serviceCategory: string;
  serviceContent: string;
  serviceTargets: string;
  supportMethods: string;
  projectStatus: string;
  servesAllPopulation: boolean;
}

interface InternetContact {
  website?: string;
  wechatPublic?: string;
  weibo?: string;
}

interface Qualification {
  qualificationType: string;
  certificateName: string;
  issuingAuthority: string;
}

interface OrganizationData {
  name: string;
  code?: string;
  entityType: string;
  registrationCountry: string;
  establishedDate?: string | null;
  coverageArea?: string;
  description?: string;
  staffCount?: number;
  address?: Address;
  services?: Service[];
  internetContact?: InternetContact;
  qualifications?: Qualification[];
  publishedAt: string;
}

interface ExcelRow {
  [key: string]: any;
  常用名称?: string;
  name?: string;
  机构信用代码?: string;
  code?: string;
  实体类型?: string;
  entityType?: string;
  注册国籍?: string;
  registrationCountry?: string;
  成立时间?: string | number;
  establishedDate?: string | number;
  '机构／项目简介'?: string;
  description?: string;
  '机构／项目全职人数'?: string | number;
  staffCount?: string | number;
  注册地?: string;
  具体地址?: string;
  street?: string;
  机构官网?: string;
  website?: string;
  机构微信公众号?: string;
  机构微博?: string;
  登记管理机关?: string;
}

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

interface LogEntry {
  timestamp: string;
  organization: {
    name: string;
    code?: string;
    entityType: string;
    registrationCountry: string;
  };
  error?: string;
  errorDetails?: any;
  reason?: string;
}

// config
const CONFIG: Config = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  STRAPI_TOKEN: process.env.STRAPI_TOKEN || '', // Strapi API Token
  EXCEL_FILE: process.env.EXCEL_FILE || '教育公益开放式数据库.xlsx',
  SHEET_NAME: process.env.SHEET_NAME || null, // sheet name, null to use the first one
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '10'), // batch size
  DRY_RUN: process.env.DRY_RUN === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '0'), // 0 to import all rows
};

// API client
class StrapiAPI {
  private client: AxiosInstance;

  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrganization(data: OrganizationData): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post(
        '/api/organizations',
        { data },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'create organization failed:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async findOrganizationByName(name: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(
        `/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`,
      );
      return response.data.data[0] || null;
    } catch (error: any) {
      console.error(
        'find organization failed:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  async createUser(data: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.post(
        '/api/users',
        data,
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'create user failed:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(
        `/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
      );
      return response.data[0] || null;
    } catch (error: any) {
      console.error('查找用户失败:', error.response?.data || error.message);
      return null;
    }
  }
}

// 数据转换工具
class DataTransformer {
  static transformAddress = (
    addressData?: Partial<Address>,
  ): Address | null => {
    if (!addressData) return null;

    return {
      country: addressData.country || DEFAULTS.COUNTRY,
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      street: addressData.street || '',
      building: addressData.building || '',
      floor: addressData.floor || '',
      room: addressData.room || '',
    };
  };

  static transformEntityType = (entityType?: string): string => {
    if (!entityType) return ENTITY_TYPE_MAPPING.其他;

    // handle keyword cases
    for (const [key, value] of Object.entries(ENTITY_TYPE_MAPPING)) {
      if (entityType.includes(key)) {
        return value;
      }
    }

    return ENTITY_TYPE_MAPPING.其他;
  };

  static transformServiceCategory = (category?: string): string => {
    return (
      SERVICE_CATEGORY_MAPPING[category || ''] || SERVICE_CATEGORY_MAPPING.其他
    );
  };

  static transformOrganization(excelRow: ExcelRow): OrganizationData {
    return {
      name: excelRow['常用名称'] || excelRow.name || '',
      code: excelRow['机构信用代码'] || excelRow.code || '',
      entityType: this.transformEntityType(
        excelRow['实体类型'] || excelRow.entityType,
      ),
      registrationCountry: this.transformRegistrationCountry(
        excelRow['注册国籍'] || excelRow.registrationCountry,
      ),
      establishedDate: this.parseDate(
        excelRow['成立时间'] || excelRow.establishedDate,
      ),
      coverageArea: this.extractCoverageFromDescription(
        excelRow['机构／项目简介'] || excelRow.description,
      ),
      description: this.cleanDescription(
        excelRow['机构／项目简介'] || excelRow.description || '',
      ),
      staffCount: this.parseStaffCount(
        excelRow['机构／项目全职人数'] || excelRow.staffCount,
      ),
      address: this.transformAddress({
        province: this.extractProvinceFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        city: this.extractCityFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        district: this.extractDistrictFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        street: excelRow['具体地址'] || excelRow.street || '',
      }),
      services: this.transformServices(excelRow),
      internetContact: this.transformContacts(excelRow),
      qualifications: this.transformQualifications(excelRow),
      publishedAt: new Date().toISOString(),
    };
  }

  static transformRegistrationCountry = (countryStr = '') =>
    countryStr.includes('国际') ? COUNTRIES.INTERNATIONAL : COUNTRIES.CHINA;

  static parseStaffCount(staffStr?: string | number): number {
    if (!staffStr) return 0;

    // extract numbers
    const match = staffStr.toString().match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }

    // handle range
    if (staffStr.toString().includes('-')) {
      const range = staffStr.toString().match(/(\d+)-(\d+)/);
      if (range) {
        return Math.floor((parseInt(range[1]) + parseInt(range[2])) / 2);
      }
    }

    return 0;
  }

  static extractProvinceFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    // format: 北京市-市辖区-东城区-  or 甘肃省-兰州市-
    const parts = addressStr.split('-');
    if (parts.length > 0) {
      return parts[0].replace(/市$|省$/, '');
    }

    return '';
  }

  static extractCityFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 1) {
      return parts[1].replace(/市$/, '');
    }

    return '';
  }

  static extractDistrictFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 2) {
      return parts[2].replace(/区$|县$/, '');
    }

    return '';
  }

  static extractCoverageFromDescription = (description?: string): string => {
    if (!description) return '';

    // extract coverage area from description (simple implementation)
    for (const keyword of COVERAGE_KEYWORDS) {
      if (description.includes(keyword)) {
        return keyword;
      }
    }

    return '';
  };

  static cleanDescription(description?: string): string {
    if (!description) return '';

    // clean description text, remove extra spaces and newlines
    return description
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 2000); // limit length
  }

  static parseDate(dateStr?: string | number): string | null {
    if (!dateStr) return null;

    // 确保 dateStr 是字符串
    const dateString = String(dateStr).trim();
    if (!dateString) return null;

    // 如果是数字，可能是 Excel 的序列号或年份
    if (/^\d+$/.test(dateString)) {
      const num = parseInt(dateString);

      // 如果是4位数，当作年份处理
      if (num >= 1900 && num <= 2100) {
        return `${num}-01-01`;
      }

      // 如果是 Excel 序列号（通常大于 25000），转换为日期
      if (num > 25000) {
        try {
          // Excel 日期从 1900-01-01 开始计算（但需要减去1，因为Excel错误地认为1900年是闰年）
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(
            excelEpoch.getTime() + (num - 2) * 24 * 60 * 60 * 1000,
          );
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.warn(`Excel日期序列号转换失败: ${dateString}`);
          return null;
        }
      }
    }

    // handle chinese date format: 2015年6月3日
    const chineseMatch = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
      const [, year, month, day] = chineseMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // handle year-month format: 2011年5月
    const yearMonthMatch = dateString.match(/(\d{4})年(\d{1,2})月/);
    if (yearMonthMatch) {
      const [, year, month] = yearMonthMatch;
      return `${year}-${month.padStart(2, '0')}-01`;
    }

    // handle year format: 2014年
    const yearMatch = dateString.match(/(\d{4})年/);
    if (yearMatch) {
      return `${yearMatch[1]}-01-01`;
    }

    // handle pure numeric year: 2014
    const simpleYearMatch = dateString.match(/^\d{4}$/);
    if (simpleYearMatch) {
      return `${dateString}-01-01`;
    }

    // try to parse directly
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`日期解析失败: ${dateString}`);
      return null;
    }
  }

  static transformServices = (excelRow: ExcelRow): Service[] => {
    const services: Service[] = [];

    // extract service information from various education related fields
    for (const field of EDUCATION_FIELDS) {
      const value = excelRow[field];
      if (value) {
        // determine service category based on field type
        let serviceCategory = SERVICE_CATEGORY_MAPPING.其他;
        if (field.includes('早教'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.学前教育;
        else if (field.includes('义务教育'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.小学教育;
        else if (field.includes('高等教育'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.高等教育;
        else if (field.includes('特殊教育'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.特殊教育;
        else if (field.includes('支教'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.教师发展;
        else if (field.includes('助学'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.学生支持;
        else if (field.includes('技术支持'))
          serviceCategory = SERVICE_CATEGORY_MAPPING.教育硬件;

        services.push({
          serviceCategory,
          serviceContent: value,
          serviceTargets: this.extractTargetGroups(excelRow),
          supportMethods: value,
          projectStatus: SERVICE_STATUS.ONGOING,
          servesAllPopulation:
            excelRow['关于人群类服务对象服务全部人群'] === '是',
        });
      }
    }

    // if no service information, create basic service based on industry service object
    if (services.length === 0 && excelRow[' 关于行业类服务对象']) {
      services.push({
        serviceCategory: SERVICE_CATEGORY_MAPPING.其他,
        serviceContent: excelRow[' 关于行业类服务对象'],
        serviceTargets: excelRow[' 关于行业类服务对象'],
        supportMethods: '',
        projectStatus: SERVICE_STATUS.ONGOING,
        servesAllPopulation: false,
      });
    }

    return services;
  };

  static extractTargetGroups = (excelRow: ExcelRow): string => {
    const targets: string[] = [];
    for (const field of TARGET_GROUP_FIELDS) {
      if (excelRow[field]) {
        targets.push(excelRow[field]);
      }
    }

    return targets.join('; ');
  };

  static transformContacts(excelRow: ExcelRow): InternetContact {
    const contact: InternetContact = {};

    // 官网
    const website = excelRow['机构官网'] || excelRow.website;
    if (website) {
      contact.website = website;
    }

    // 微信公众号
    const wechat = excelRow['机构微信公众号'];
    if (wechat) {
      contact.wechatPublic = wechat;
    }

    // 微博
    const weibo = excelRow['机构微博'];
    if (weibo) {
      contact.weibo = weibo;
    }

    return contact;
  }

  static transformQualifications = (excelRow: ExcelRow): Qualification[] => {
    const qualifications: Qualification[] = [];

    // Check for various qualification indicators in the data
    for (const indicator of QUALIFICATION_INDICATORS) {
      if (excelRow[indicator]) {
        let qualificationType = QUALIFICATION_TYPES.NO_SPECIAL;

        if (indicator.includes('免税') || indicator.includes('税前扣除')) {
          qualificationType = QUALIFICATION_TYPES.TAX_DEDUCTION;
        } else if (indicator.includes('公开募捐')) {
          qualificationType = QUALIFICATION_TYPES.PUBLIC_FUNDRAISING;
        } else if (indicator.includes('慈善组织')) {
          qualificationType = QUALIFICATION_TYPES.TAX_EXEMPT;
        }

        qualifications.push({
          qualificationType,
          certificateName: indicator,
          issuingAuthority: '相关主管部门',
        });
      }
    }

    // Add general qualification if organization has any legal status
    if (excelRow['登记管理机关'] && qualifications.length === 0) {
      qualifications.push({
        qualificationType: QUALIFICATION_TYPES.NO_SPECIAL,
        certificateName: '社会组织登记证书',
        issuingAuthority: excelRow['登记管理机关'],
      });
    }

    return qualifications;
  };
}

// Excel data reader
class ExcelReader {
  static readExcelFile(
    filePath: string,
    sheetName: string | null = null,
  ): ExcelRow[] {
    try {
      console.log(`读取 Excel 文件: ${filePath}`);
      const workbook = XLSX.readFile(filePath);

      console.log(`发现工作表: ${workbook.SheetNames.join(', ')}`);

      // if not specified, use the first one
      const targetSheet = sheetName || workbook.SheetNames[0];

      if (!workbook.SheetNames.includes(targetSheet)) {
        throw new Error(`工作表 "${targetSheet}" 不存在`);
      }

      console.log(`使用工作表: ${targetSheet}`);

      const worksheet = workbook.Sheets[targetSheet];
      const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      console.log(`成功读取 ${data.length} 行数据`);

      // show data overview
      if (data.length > 0) {
        console.log(`数据字段: ${Object.keys(data[0]).length} 个`);
        console.log(
          `示例字段: ${Object.keys(data[0]).slice(0, 5).join(', ')}...`,
        );
      }

      return data;
    } catch (error: any) {
      console.error('读取 Excel 文件失败:', error.message);
      throw error;
    }
  }

  static getSheetNames(filePath: string): string[] {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames;
    } catch (error: any) {
      console.error('获取工作表名称失败:', error.message);
      throw error;
    }
  }
}

// Logger class for tracking import results
class ImportLogger {
  private timestamp: string;
  private logDir: string;
  private failedFile: string;
  private skippedFile: string;
  public failedCount: number = 0;
  public skippedCount: number = 0;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = LOG_CONSTANTS.LOG_DIR;
    this.failedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.FAILED_LOG_PREFIX}${this.timestamp}.log`,
    );
    this.skippedFile = path.join(
      this.logDir,
      `${LOG_CONSTANTS.SKIPPED_LOG_PREFIX}${this.timestamp}.log`,
    );

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize log files with headers
    this.initLogFiles();
  }

  private initLogFiles(): void {
    const header = LOG_CONSTANTS.HEADER_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    fs.writeFileSync(this.failedFile, `# 失败记录\n${header}`);
    fs.writeFileSync(this.skippedFile, `# 跳过记录\n${header}`);

    console.log(`📝 日志文件已初始化:`);
    console.log(`   失败记录: ${this.failedFile}`);
    console.log(`   跳过记录: ${this.skippedFile}`);
  }

  logFailed(orgData: OrganizationData, error: any): void {
    this.failedCount++;
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      organization: {
        name: orgData.name,
        code: orgData.code,
        entityType: orgData.entityType,
        registrationCountry: orgData.registrationCountry,
      },
      error: error.message,
      errorDetails: error.response?.data || error.stack,
    };

    // Append to log file immediately
    const logLine = `[${logEntry.timestamp}] ${orgData.name} | ${error.message}\n`;
    const detailLine = `   详细错误: ${JSON.stringify(logEntry.errorDetails, null, 2).replace(/\n/g, '\n   ')}\n\n`;

    fs.appendFileSync(this.failedFile, logLine + detailLine);
  }

  logSkipped(orgData: OrganizationData, reason: string): void {
    this.skippedCount++;
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      organization: {
        name: orgData.name,
        code: orgData.code,
        entityType: orgData.entityType,
        registrationCountry: orgData.registrationCountry,
      },
      reason: reason,
    };

    // Append to log file immediately
    const logLine = `[${logEntry.timestamp}] ${orgData.name} | ${reason}\n`;
    const detailLine = `   详细信息: ${JSON.stringify(logEntry.organization, null, 2).replace(/\n/g, '\n   ')}\n\n`;

    fs.appendFileSync(this.skippedFile, logLine + detailLine);
  }

  saveToFiles(): void {
    // Add summary to log files
    const summary = LOG_CONSTANTS.SUMMARY_TEMPLATE.replace(
      '{timestamp}',
      new Date().toISOString(),
    );

    if (this.failedCount > 0) {
      fs.appendFileSync(
        this.failedFile,
        `${summary}# 总失败数: ${this.failedCount}\n`,
      );
      console.log(
        `✗ 失败记录已保存: ${this.failedFile} (${this.failedCount} 条)`,
      );
    }

    if (this.skippedCount > 0) {
      fs.appendFileSync(
        this.skippedFile,
        `${summary}# 总跳过数: ${this.skippedCount}\n`,
      );
      console.log(
        `📝 跳过记录已保存: ${this.skippedFile} (${this.skippedCount} 条)`,
      );
    }
  }

  getSummary(): { failed: number; skipped: number } {
    return {
      failed: this.failedCount,
      skipped: this.skippedCount,
    };
  }
}

// data importer
class DataImporter {
  private api: StrapiAPI;
  public logger: ImportLogger;
  private stats: ImportStats;

  constructor(api: StrapiAPI) {
    this.api = api;
    this.logger = new ImportLogger();
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };
  }

  async importOrganizations(organizations: OrganizationData[]): Promise<void> {
    console.log(`开始导入 ${organizations.length} 个组织...`);

    for (let i = 0; i < organizations.length; i += CONFIG.BATCH_SIZE) {
      const batch = organizations.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(
        `处理批次 ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(organizations.length / CONFIG.BATCH_SIZE)}`,
      );

      await this.processBatch(batch);

      // add delay to avoid API limit
      if (i + CONFIG.BATCH_SIZE < organizations.length) {
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

      if (CONFIG.DRY_RUN) {
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

// main function
async function main(): Promise<void> {
  let importer: DataImporter | null = null;

  // 处理进程信号，确保强制退出时保存日志
  const handleExit = (signal: string) => {
    console.log(`\n收到 ${signal} 信号，正在保存日志...`);
    if (importer && importer.logger) {
      importer.logger.saveToFiles();
      console.log('日志已保存，程序退出。');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => handleExit('SIGTERM')); // 终止信号
  process.on('SIGQUIT', () => handleExit('SIGQUIT')); // 退出信号

  try {
    console.log('=== Strapi 数据导入工具 ===\n');

    // validate config
    if (!CONFIG.STRAPI_TOKEN && !CONFIG.DRY_RUN) {
      throw new Error('请设置 STRAPI_TOKEN 环境变量或使用 DRY_RUN=true');
    }

    const excelPath = path.join(process.cwd(), CONFIG.EXCEL_FILE);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel 文件不存在: ${excelPath}`);
    }

    // read Excel data
    const rawData = ExcelReader.readExcelFile(excelPath, CONFIG.SHEET_NAME);

    // limit data for testing
    const limitedData =
      CONFIG.MAX_ROWS > 0 ? rawData.slice(0, CONFIG.MAX_ROWS) : rawData;
    if (CONFIG.MAX_ROWS > 0) {
      console.log(
        `限制导入数据量: ${limitedData.length} 行 (总共 ${rawData.length} 行)`,
      );
    }

    // transform data format
    console.log('转换数据格式...');
    const organizations = limitedData
      .map((row) => {
        try {
          return DataTransformer.transformOrganization(row);
        } catch (error: any) {
          const orgName = row['常用名称'] || row.name || 'Unknown';
          console.warn(`转换数据失败，跳过行: ${orgName}`, error.message);
          // 可选：记录转换失败的详细信息到日志
          return null;
        }
      })
      .filter((org): org is OrganizationData => org !== null && !!org.name); // filter out failed and without name organizations

    console.log(`转换完成，准备导入 ${organizations.length} 个组织\n`);

    if (CONFIG.DRY_RUN) {
      console.log('=== DRY RUN 模式 ===');
      organizations.slice(0, 3).forEach((org, index) => {
        console.log(`示例 ${index + 1}:`, JSON.stringify(org, null, 2));
      });
      console.log('==================\n');
    }

    // initialize API client
    const api = new StrapiAPI(CONFIG.STRAPI_URL, CONFIG.STRAPI_TOKEN);

    // initialize importer
    importer = new DataImporter(api);

    // start import
    await importer.importOrganizations(organizations);

    console.log('导入完成！');
  } catch (error: any) {
    console.error('导入失败:', error.message);
    process.exit(1);
  }
}

// handle command line arguments
function parseArgs(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Strapi 数据导入工具

用法:
  tsx scripts/import-data.ts [选项]

选项:
  --dry-run, -d     仅模拟导入，不实际创建数据
  --help, -h        显示帮助信息

环境变量:
  STRAPI_URL        Strapi 服务器地址 (默认: http://localhost:1337)
  STRAPI_TOKEN      Strapi API Token
  EXCEL_FILE        Excel 文件路径 (默认: 教育公益开放式数据库1.0版的副本.xlsx)
  SHEET_NAME        工作表名称 (默认: 使用第一个工作表)
  BATCH_SIZE        批次大小 (默认: 10)
  MAX_ROWS          最大导入行数 (默认: 0, 表示导入所有行)
  DRY_RUN           模拟模式 (true/false)

示例:
  # 正常导入
  STRAPI_TOKEN=your_token tsx import-data.ts
  
  # 模拟导入
  DRY_RUN=true tsx import-data.ts
  
  # 导入指定工作表
  SHEET_NAME="甘肃省" STRAPI_TOKEN=your_token tsx import-data.ts
  
  # 导入前100行进行测试
  MAX_ROWS=100 DRY_RUN=true tsx import-data.ts
  
  # 使用自定义文件
  EXCEL_FILE=data.xlsx STRAPI_TOKEN=your_token tsx import-data.ts
`);
    process.exit(0);
  }

  if (args.includes('--dry-run') || args.includes('-d')) {
    CONFIG.DRY_RUN = true;
  }
}

// if directly run this script
if (require.main === module) {
  parseArgs();
  main();
}

export { DataTransformer, ExcelReader, DataImporter, StrapiAPI };
