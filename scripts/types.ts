/**
 * 类型定义模块
 * 集中管理所有接口和类型定义
 */

// 配置接口
export interface Config {
  STRAPI_URL: string;
  STRAPI_TOKEN: string;
  EXCEL_FILE: string;
  SHEET_NAME: string | null;
  BATCH_SIZE: number;
  DRY_RUN: boolean;
  MAX_ROWS: number;
}

// 地址接口
export interface Address {
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  building?: string;
  floor?: string;
  room?: string;
}

// 服务接口
export interface Service {
  serviceCategory: string;
  serviceContent: string;
  serviceTargets: string;
  supportMethods: string;
  projectStatus: string;
  servesAllPopulation: boolean;
}

// 网络联系方式接口
export interface InternetContact {
  website?: string;
  wechatPublic?: string;
  weibo?: string;
}

// 资格认证接口
export interface Qualification {
  qualificationType:
    | 'no_special_qualification'
    | 'tax_deduction_eligible'
    | 'public_fundraising_qualified'
    | 'tax_exempt_qualified';
  certificateName: string;
  issuingAuthority: string;
}

// 组织数据接口
export interface OrganizationData {
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

// Excel行数据接口
export interface Organization {
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

// 导入统计接口
export interface ImportStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  organization: Pick<
    OrganizationData,
    'name' | 'code' | 'entityType' | 'registrationCountry'
  >;
  error?: string;
  errorDetails?: any;
  reason?: string;
}
