/**
 * 常量定义模块
 * 集中管理所有静态常量和映射关系
 */

// 实体类型映射
export const ENTITY_TYPE_MAPPING: Record<string, string> = {
  基金会: 'foundation',
  '社会服务机构（民非/NGO）': 'ngo',
  民办非企业单位: 'ngo',
  社会团体: 'association',
  企业: 'company',
  政府机构: 'government',
  学校: 'school',
  其他: 'other',
};

// 服务类别映射
export const SERVICE_CATEGORY_MAPPING: Record<string, string> = {
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
  HEADER_TEMPLATE:
    '# Import Log - {timestamp}\n# Format: [timestamp] organization_name | error/reason\n\n',
  SUMMARY_TEMPLATE: '\n# 导入完成统计 - {timestamp}\n',
  FAILED_LOG_PREFIX: 'import-failed-',
  SKIPPED_LOG_PREFIX: 'import-skipped-',
  LOG_DIR: 'logs',
} as const;

// 服务状态常量
export const SERVICE_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  PLANNED: 'planned',
} as const;

// 资格类型常量
export const QUALIFICATION_TYPES = {
  NO_SPECIAL: 'no_special_qualification',
  TAX_DEDUCTION: 'tax_deduction_eligible',
  PUBLIC_FUNDRAISING: 'public_fundraising_qualified',
  TAX_EXEMPT: 'tax_exempt_qualified',
} as const;

// 国家相关常量
export const COUNTRIES = {
  CHINA: 'china',
  INTERNATIONAL: 'international',
} as const;

// 通用字符串常量
export const COMMON_STRINGS = {
  YES: '是',
  NO: '否',
  AUTHORITY: '相关主管部门',
  REGISTRATION_CERTIFICATE: '社会组织登记证书',
} as const;
