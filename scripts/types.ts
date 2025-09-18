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
  BATCH_DELAY: number;
  DRY_RUN: boolean;
  MAX_ROWS: number;
}

export {
  LocationAddressComponent as Address,
  ServiceOrganizationServiceComponent as Service,
  ContactInternetContactComponent as InternetContact,
  QualificationCertificateComponent as Qualification,
  // 注意：我们重新定义了 OrganizationData，所以不再从 '../types' 导出
  UsersPermissionsUser as UserData,
} from '../types';

// 扩展的用户数据接口（包含自定义字段）
export interface ExtendedUserData
  extends Omit<import('../types').UsersPermissionsUser, 'id'> {
  // 用户创建时不需要ID，但可以包含其他可选字段
  id?: number;
  // 自定义字段
  phone?: string;
  // 其他可能需要的字段
  password?: string;
  // 角色可以是ID或完整对象
  role?: number | import('../types').UsersPermissionsRole;
}

// 组织数据接口 - 扩展以支持联系用户创建和引用
type BaseOrganizationData = Omit<
  import('../types').Organization,
  'contactUser'
>;
type ExtendedOrganizationData = BaseOrganizationData & {
  // contactUser 可以是用户对象（用于创建）或用户ID（用于引用）
  contactUser?: number | null;
};
export type OrganizationData = ExtendedOrganizationData;

// Excel行数据接口
export interface Organization extends Partial<import('../types').Organization> {
  // 添加索引签名以支持动态中文属性名访问
  [key: string]: any;
  常用名称?: string;
  机构信用代码?: string;
  实体类型?: string;
  注册国籍?: string;
  成立时间?: string | number;
  '机构／项目简介'?: string;
  '机构／项目全职人数'?: string | number;
  注册地?: string;
  具体地址?: string;
  机构官网?: string;
  机构微信公众号?: string;
  机构微博?: string;
  登记管理机关?: string;
  负责人?: string;
  机构联系人联系人姓名?: string;
  机构联系人联系人电话?: string;
  机构联系人联系人邮箱?: string;
}

// 导入统计接口
export interface ImportStats extends Record<string, number> {
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
