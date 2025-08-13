/**
 * 常量定义模块
 * 集中管理所有静态常量和映射关系
 */

import {
  OrganizationEntityTypeEnum,
  OrganizationRegistrationCountryEnum,
  QualificationCertificateComponentQualificationTypeEnum,
  ServiceOrganizationServiceComponentProjectStatusEnum,
  ServiceOrganizationServiceComponentServiceCategoryEnum,
} from '../types';

// 实体类型映射
export const ENTITY_TYPE_MAPPING: Record<string, OrganizationEntityTypeEnum> = {
  基金会: OrganizationEntityTypeEnum.Foundation,
  '社会服务机构（民非/NGO）': OrganizationEntityTypeEnum.Ngo,
  民办非企业单位: OrganizationEntityTypeEnum.Ngo,
  社会团体: OrganizationEntityTypeEnum.Association,
  企业: OrganizationEntityTypeEnum.Company,
  政府机构: OrganizationEntityTypeEnum.Government,
  学校: OrganizationEntityTypeEnum.School,
  其他: OrganizationEntityTypeEnum.Other,
};

// 服务类别映射
export const SERVICE_CATEGORY_MAPPING = {
  学前教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.EarlyEducation,
  小学教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.PrimaryEducation,
  中学教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.SecondaryEducation,
  高等教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.HigherEducation,
  职业教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.VocationalEducation,
  继续教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.ContinuingEducation,
  特殊教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.SpecialEducation,
  社区教育:
    ServiceOrganizationServiceComponentServiceCategoryEnum.CommunityEducation,
  政策研究:
    ServiceOrganizationServiceComponentServiceCategoryEnum.PolicyResearch,
  教师发展:
    ServiceOrganizationServiceComponentServiceCategoryEnum.TeacherDevelopment,
  教育内容:
    ServiceOrganizationServiceComponentServiceCategoryEnum.EducationalContent,
  教育硬件:
    ServiceOrganizationServiceComponentServiceCategoryEnum.EducationalHardware,
  学生支持:
    ServiceOrganizationServiceComponentServiceCategoryEnum.StudentSupport,
  扫盲项目:
    ServiceOrganizationServiceComponentServiceCategoryEnum.LiteracyPrograms,
  组织支持:
    ServiceOrganizationServiceComponentServiceCategoryEnum.OrganizationSupport,
  其他: ServiceOrganizationServiceComponentServiceCategoryEnum.Other,
};

// 教育相关字段列表
export const EDUCATION_FIELDS = [
  '关于人群类服务对象早教',
  '关于人群类服务对象义务教育',
  '关于人群类服务对象高等教育',
  '关于人群类服务对象 对服务人群的支持方向',
  '教育专业／行业／平台发展与技术支持',
  '特殊教育',
  '支教',
  '助学',
  '成长多样化需求',
] as const;

// 目标群体字段列表
export const TARGET_GROUP_FIELDS = [
  '关于人群类服务对象早教',
  '关于人群类服务对象义务教育',
  '关于人群类服务对象高等教育',
  '关于人群类服务对象 对服务人群的支持方向',
] as const;

// 资格认证指标列表
export const QUALIFICATION_INDICATORS = [
  '免税资格',
  '税前扣除资格',
  '公开募捐资格',
  '公益性捐赠税前扣除资格',
  '慈善组织认定',
  '社会组织评估等级',
] as const;

// 覆盖区域关键词列表
export const COVERAGE_KEYWORDS = [
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
] as const;

// 默认值常量
export const DEFAULTS = {
  COUNTRY: '中国',
  STAFF_COUNT: 0,
  DESCRIPTION_MAX_LENGTH: 2000,
  BATCH_DELAY_MS: 1000,
} as const;

// 日期格式正则表达式
export const DATE_PATTERNS = {
  CHINESE_FULL: /(\d{4})年(\d{1,2})月(\d{1,2})日/,
  CHINESE_YEAR_MONTH: /(\d{4})年(\d{1,2})月/,
  CHINESE_YEAR: /(\d{4})年/,
  SIMPLE_YEAR: /^\d{4}$/,
  EXCEL_SERIAL_MIN: 25000,
  YEAR_MIN: 1900,
  YEAR_MAX: 2100,
} as const;

// 日志相关常量
export const LOG_CONSTANTS = {
  HEADER_TEMPLATE: `# Import Log - {timestamp}
# Format: [timestamp] organization_name | error/reason

`,
  SUMMARY_TEMPLATE: `
# 导入完成统计 - {timestamp}
`,
  FAILED_LOG_PREFIX: 'import-failed-',
  SKIPPED_LOG_PREFIX: 'import-skipped-',
  LOG_DIR: 'logs',
} as const;

// 服务状态常量
export const SERVICE_STATUS = {
  ONGOING: ServiceOrganizationServiceComponentProjectStatusEnum.Ongoing,
  COMPLETED: ServiceOrganizationServiceComponentProjectStatusEnum.Completed,
} as const;

// 资格类型常量
export const QUALIFICATION_TYPES = {
  NO_SPECIAL:
    QualificationCertificateComponentQualificationTypeEnum.NoSpecialQualification,
  TAX_DEDUCTION:
    QualificationCertificateComponentQualificationTypeEnum.TaxDeductionEligible,
  PUBLIC_FUNDRAISING:
    QualificationCertificateComponentQualificationTypeEnum.PublicFundraisingQualified,
  TAX_EXEMPT:
    QualificationCertificateComponentQualificationTypeEnum.TaxExemptQualified,
} as const;

// 国家相关常量
export const COUNTRIES = {
  CHINA: OrganizationRegistrationCountryEnum.China,
  INTERNATIONAL: OrganizationRegistrationCountryEnum.International,
};

// 通用字符串常量
export const COMMON_STRINGS = {
  YES: '是',
  NO: '否',
  AUTHORITY: '相关主管部门',
  REGISTRATION_CERTIFICATE: '社会组织登记证书',
} as const;
