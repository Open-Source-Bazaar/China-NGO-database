#!/usr/bin/env node

/**
 * Strapi database import script
 * support import NGO organization data from Excel file to Strapi database
 */

const XLSX = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// config
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  STRAPI_TOKEN:
    process.env.STRAPI_TOKEN ||
    'ec62196b162352395d8259d645fcce3e361339ee72a0f0f0023f7cf9b2af86c6595619e54af6101723bba66fe38567c8987f17b4f69f1fd44db79e7a0467a11a6f9ff647ff1ea49af85a8d549effcaf6f38652daa8b04ae90799eee0b115ee8083a7723db7ab1f8038908bc585745aee52c652b7acd26dc87cae616bfa61465a', // Strapi API Token
  EXCEL_FILE: process.env.EXCEL_FILE || '教育公益开放式数据库.xlsx',
  SHEET_NAME: process.env.SHEET_NAME || null, // sheet name, null to use the first one
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 2, // batch size
  DRY_RUN: process.env.DRY_RUN === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS) || 0, // 0 to import all rows
};

// API client
class StrapiAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createOrganization(data) {
    try {
      const response = await this.client.post('/api/organizations', { data });
      return response.data;
    } catch (error) {
      console.error(
        'create organization failed:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async findOrganizationByName(name) {
    try {
      const response = await this.client.get(
        `/api/organizations?filters[name][$eq]=${encodeURIComponent(name)}`,
      );
      return response.data.data[0] || null;
    } catch (error) {
      console.error(
        'find organization failed:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  async createUser(data) {
    try {
      const response = await this.client.post('/api/users', data);
      return response.data;
    } catch (error) {
      console.error(
        'create user failed:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      const response = await this.client.get(
        `/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
      );
      return response.data[0] || null;
    } catch (error) {
      console.error('查找用户失败:', error.response?.data || error.message);
      return null;
    }
  }
}

// 数据转换工具
class DataTransformer {
  static transformAddress(addressData) {
    if (!addressData) return null;

    return {
      country: addressData.country || '中国',
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      street: addressData.street || '',
      building: addressData.building || '',
      floor: addressData.floor || '',
      room: addressData.room || '',
    };
  }

  static transformEntityType(entityType) {
    if (!entityType) return 'other';

    const mapping = {
      基金会: 'foundation',
      '社会服务机构（民非/NGO）': 'ngo',
      民办非企业单位: 'ngo',
      社会团体: 'association',
      企业: 'company',
      政府机构: 'government',
      学校: 'school',
      其他: 'other',
    };

    // handle keyword cases
    for (const [key, value] of Object.entries(mapping)) {
      if (entityType.includes(key)) {
        return value;
      }
    }

    return 'other';
  }

  static transformServiceCategory(category) {
    const mapping = {
      学前教育: 'early_education',
      小学教育: 'primary_education',
      中学教育: 'secondary_education',
      高等教育: 'higher_education',
      职业教育: 'vocational_education',
      继续教育: 'continuing_education',
      特殊教育: 'special_education',
      社区教育: 'community_education',
      政策研究: 'policy_research',
      教师发展: 'teacher_development',
      教育内容: 'educational_content',
      教育硬件: 'educational_hardware',
      学生支持: 'student_support',
      扫盲项目: 'literacy_programs',
      组织支持: 'organization_support',
      其他: 'other',
    };
    return mapping[category] || 'other';
  }

  static transformOrganization(excelRow) {
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

  static transformRegistrationCountry(countryStr) {
    if (!countryStr) return 'china';
    return countryStr.includes('国际') ? 'international' : 'china';
  }

  static parseStaffCount(staffStr) {
    if (!staffStr) return 0;

    // extract numbers
    const match = staffStr.toString().match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }

    // handle range
    if (staffStr.includes('-')) {
      const range = staffStr.match(/(\d+)-(\d+)/);
      if (range) {
        return Math.floor((parseInt(range[1]) + parseInt(range[2])) / 2);
      }
    }

    return 0;
  }

  static extractProvinceFromAddress(addressStr) {
    if (!addressStr) return '';

    // format: 北京市-市辖区-东城区-  or 甘肃省-兰州市-
    const parts = addressStr.split('-');
    if (parts.length > 0) {
      return parts[0].replace(/市$|省$/, '');
    }

    return '';
  }

  static extractCityFromAddress(addressStr) {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 1) {
      return parts[1].replace(/市$/, '');
    }

    return '';
  }

  static extractDistrictFromAddress(addressStr) {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 2) {
      return parts[2].replace(/区$|县$/, '');
    }

    return '';
  }

  static extractCoverageFromDescription(description) {
    if (!description) return '';

    // extract coverage area from description (simple implementation)
    const keywords = [
      '全国',
      '北京',
      '上海',
      '广东',
      '浙江',
      '江苏',
      '山东',
      '河南',
      '湖北',
      '湖南',
      '四川',
      '重庆',
      '陕西',
      '甘肃',
      '青海',
      '西藏',
      '新疆',
      '内蒙古',
      '黑龙江',
      '吉林',
      '辽宁',
      '河北',
      '山西',
      '安徽',
      '江西',
      '福建',
      '台湾',
      '海南',
      '广西',
      '云南',
      '贵州',
      '宁夏',
    ];

    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        return keyword;
      }
    }

    return '';
  }

  static cleanDescription(description) {
    if (!description) return '';

    // clean description text, remove extra spaces and newlines
    return description
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 2000); // limit length
  }

  static parseDate(dateStr) {
    if (!dateStr) return null;

    // handle chinese date format: 2015年6月3日
    const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (chineseMatch) {
      const [, year, month, day] = chineseMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // handle year-month format: 2011年5月
    const yearMonthMatch = dateStr.match(/(\d{4})年(\d{1,2})月/);
    if (yearMonthMatch) {
      const [, year, month] = yearMonthMatch;
      return `${year}-${month.padStart(2, '0')}-01`;
    }

    // handle year format: 2014年
    const yearMatch = dateStr.match(/(\d{4})年/);
    if (yearMatch) {
      return `${yearMatch[1]}-01-01`;
    }

    // handle pure numeric year: 2014
    const simpleYearMatch = dateStr.match(/^\d{4}$/);
    if (simpleYearMatch) {
      return `${dateStr}-01-01`;
    }

    // try to parse directly
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  static transformServices(excelRow) {
    const services = [];

    // extract service information from various education related fields
    const educationFields = [
      '关于人群类服务对象早教',
      '关于人群类服务对象义务教育',
      '关于人群类服务对象高等教育',
      '关于人群类服务对象 对服务人群的支持方向',
      '教育专业／行业／平台发展与技术支持',
      '特殊教育',
      '支教',
      '助学',
      '成长多样化需求',
    ];

    educationFields.forEach((field) => {
      const value = excelRow[field];
      if (value) {
        // determine service category based on field type
        let serviceCategory = 'other';
        if (field.includes('早教')) serviceCategory = 'early_education';
        else if (field.includes('义务教育'))
          serviceCategory = 'primary_education';
        else if (field.includes('高等教育'))
          serviceCategory = 'higher_education';
        else if (field.includes('特殊教育'))
          serviceCategory = 'special_education';
        else if (field.includes('支教'))
          serviceCategory = 'teacher_development';
        else if (field.includes('助学')) serviceCategory = 'student_support';
        else if (field.includes('技术支持'))
          serviceCategory = 'educational_hardware';

        services.push({
          serviceCategory,
          serviceContent: value,
          serviceTargets: this.extractTargetGroups(excelRow),
          supportMethods: value,
          projectStatus: 'ongoing',
          servesAllPopulation:
            excelRow['关于人群类服务对象服务全部人群'] === '是',
        });
      }
    });

    // if no service information, create basic service based on industry service object
    if (services.length === 0 && excelRow[' 关于行业类服务对象']) {
      services.push({
        serviceCategory: 'other',
        serviceContent: excelRow[' 关于行业类服务对象'],
        serviceTargets: excelRow[' 关于行业类服务对象'],
        supportMethods: '',
        projectStatus: 'ongoing',
        servesAllPopulation: false,
      });
    }

    return services;
  }

  static extractTargetGroups(excelRow) {
    const targetFields = [
      '关于人群类服务对象早教',
      '关于人群类服务对象义务教育',
      '关于人群类服务对象高等教育',
      '关于人群类服务对象 对服务人群的支持方向',
    ];

    const targets = [];
    targetFields.forEach((field) => {
      if (excelRow[field]) {
        targets.push(excelRow[field]);
      }
    });

    return targets.join('; ');
  }

  static transformContacts(excelRow) {
    const contact = {};

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

  static transformQualifications(excelRow) {
    const qualifications = [];

    // Check for various qualification indicators in the data
    const qualificationIndicators = [
      '免税资格',
      '税前扣除资格',
      '公开募捐资格',
      '公益性捐赠税前扣除资格',
      '慈善组织认定',
      '社会组织评估等级',
    ];

    qualificationIndicators.forEach((indicator) => {
      if (excelRow[indicator]) {
        let qualificationType = 'no_special_qualification';

        if (indicator.includes('免税') || indicator.includes('税前扣除')) {
          qualificationType = 'tax_deduction_eligible';
        } else if (indicator.includes('公开募捐')) {
          qualificationType = 'public_fundraising_qualified';
        } else if (indicator.includes('慈善组织')) {
          qualificationType = 'tax_exempt_qualified';
        }

        qualifications.push({
          qualificationType,
          certificateName: indicator,
          issuingAuthority: '相关主管部门',
        });
      }
    });

    // Add general qualification if organization has any legal status
    if (excelRow['登记管理机关'] && qualifications.length === 0) {
      qualifications.push({
        qualificationType: 'no_special_qualification',
        certificateName: '社会组织登记证书',
        issuingAuthority: excelRow['登记管理机关'],
      });
    }

    return qualifications;
  }
}

// Excel data reader
class ExcelReader {
  static readExcelFile(filePath, sheetName = null) {
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
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`成功读取 ${data.length} 行数据`);

      // show data overview
      if (data.length > 0) {
        console.log(`数据字段: ${Object.keys(data[0]).length} 个`);
        console.log(
          `示例字段: ${Object.keys(data[0]).slice(0, 5).join(', ')}...`,
        );
      }

      return data;
    } catch (error) {
      console.error('读取 Excel 文件失败:', error.message);
      throw error;
    }
  }

  static getSheetNames(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames;
    } catch (error) {
      console.error('获取工作表名称失败:', error.message);
      throw error;
    }
  }
}

// data importer
class DataImporter {
  constructor(api) {
    this.api = api;
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };
  }

  async importOrganizations(organizations) {
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
  }

  async processBatch(organizations) {
    const promises = organizations.map((org) => this.processOrganization(org));
    await Promise.allSettled(promises);
  }

  async processOrganization(orgData) {
    try {
      this.stats.total++;

      // check if organization already exists
      if (orgData.name) {
        const existing = await this.api.findOrganizationByName(orgData.name);
        if (existing) {
          console.log(`跳过已存在的组织: ${orgData.name}`);
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
    } catch (error) {
      console.error(`✗ 创建组织失败: ${orgData.name}`, error.message);
      this.stats.failed++;
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  printStats() {
    console.log('\n=== 导入统计 ===');
    console.log(`总计: ${this.stats.total}`);
    console.log(`成功: ${this.stats.success}`);
    console.log(`失败: ${this.stats.failed}`);
    console.log(`跳过: ${this.stats.skipped}`);
    console.log('================\n');
  }
}

// main function
async function main() {
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
        } catch (error) {
          console.warn(
            `转换数据失败，跳过行: ${row['常用名称'] || 'Unknown'}`,
            error.message,
          );
          return null;
        }
      })
      .filter((org) => org && org.name); // filter out failed and without name organizations

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
    const importer = new DataImporter(api);

    // start import
    await importer.importOrganizations(organizations);

    console.log('导入完成！');
  } catch (error) {
    console.error('导入失败:', error.message);
    process.exit(1);
  }
}

// handle command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Strapi 数据导入工具

用法:
  node scripts/import-data.js [选项]

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
  STRAPI_TOKEN=your_token node import-data.js
  
  # 模拟导入
  DRY_RUN=true node import-data.js
  
  # 导入指定工作表
  SHEET_NAME="甘肃省" STRAPI_TOKEN=your_token node import-data.js
  
  # 导入前100行进行测试
  MAX_ROWS=100 DRY_RUN=true node import-data.js
  
  # 使用自定义文件
  EXCEL_FILE=data.xlsx STRAPI_TOKEN=your_token node import-data.js
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

module.exports = {
  DataTransformer,
  ExcelReader,
  DataImporter,
  StrapiAPI,
};
