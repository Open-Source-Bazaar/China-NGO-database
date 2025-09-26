/**
 * 类型定义模块
 * 集中管理所有接口和类型定义
 */
import { Base, BaseUser } from 'mobx-strapi';
import {
  Organization,
  UsersPermissionsRole,
  UsersPermissionsUser,
} from '../types';

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
} from '../types';

// 目标数据类型 (Strapi英文字段)
export type TargetOrganization = Organization & Base;

// 扩展的用户数据接口（包含自定义字段）
export type TargetUser = UsersPermissionsUser &
  BaseUser & {
    // 自定义字段
    phone?: string;
    // 其他可能需要的字段
    password?: string;
    // 角色可以是ID或完整对象
    role?: UsersPermissionsRole;
  };

// 源数据类型 (Excel中文字段)
export interface SourceOrganization {
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
  sourceItem?: object;
  error?: string;
  errorDetails?: any;
  reason?: string;
}
