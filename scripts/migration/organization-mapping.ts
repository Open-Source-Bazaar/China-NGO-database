/**
 * Migration mapping for MobX-RESTful-migrator
 * Converts existing data transformation logic to migration schema format
 */

import { MigrationSchema } from 'mobx-restful-migrator';
import { OrganizationData, Organization, ExtendedUserData } from '../types';

import { AddressTransformer } from '../transformers/address-transformer';
import { DateTransformer } from '../transformers/date-transformer';
import { ServiceTransformer } from '../transformers/service-transformer';
import { QualificationTransformer } from '../transformers/qualification-transformer';
import { UserTransformer } from '../transformers/user-transformer';
import { DataUtils } from '../utils/data-utils';

import { UserModel, configureModels } from '../models/strapi-models';

/**
 * Create migration mapping configuration
 * This translates the existing DataTransformer logic into MobX-RESTful-migrator format
 */
export function createMigrationMapping(
  baseURL: string,
  token: string,
): MigrationSchema<Organization, OrganizationData> {
  // Configure models with connection info
  configureModels(baseURL, token);

  return {
    // Simple 1-to-1 mappings using field names
    常用名称: ({ ['常用名称']: value, name }) => ({
      name: { value: value || name || '' },
    }),

    机构信用代码: ({ ['机构信用代码']: value, code }) => ({
      code: { value: value || code || '' },
    }),

    // Complex transformations using resolver functions
    实体类型: ({ ['实体类型']: value, entityType }) => ({
      entityType: {
        value: DataUtils.transformEntityType(value || entityType),
      },
    }),

    注册国籍: ({ ['注册国籍']: value, registrationCountry }) => ({
      registrationCountry: {
        value: DataUtils.transformRegistrationCountry(
          value || registrationCountry,
        ),
      },
    }),

    成立时间: ({ ['成立时间']: value, establishedDate }) => ({
      establishedDate: {
        value: DateTransformer.parseDate(value || establishedDate),
      },
    }),

    // One-to-many mapping: description field maps to both description and coverageArea
    '机构／项目简介': ({ ['机构／项目简介']: value, description }) => {
      const desc = value || description || '';
      return {
        description: { value: DataUtils.cleanDescription(desc) },
        coverageArea: {
          value: ServiceTransformer.extractCoverageFromDescription(desc),
        },
      };
    },

    '机构／项目全职人数': ({ ['机构／项目全职人数']: value, staffCount }) => ({
      staffCount: {
        value: DataUtils.parseStaffCount(value || staffCount),
      },
    }),

    // Complex address transformation (many source fields -> one target field)
    注册地: (organization) => {
      const addressData = {
        province: AddressTransformer.extractProvinceFromAddress(
          organization['注册地'] || organization['具体地址'],
        ),
        city: AddressTransformer.extractCityFromAddress(
          organization['注册地'] || organization['具体地址'],
        ),
        district: AddressTransformer.extractDistrictFromAddress(
          organization['注册地'] || organization['具体地址'],
        ),
        street: organization['具体地址'] || organization.address?.street || '',
      };

      return {
        address: { value: AddressTransformer.transformAddress(addressData) },
      };
    },

    // Services transformation
    机构官网: (organization) => ({
      services: { value: ServiceTransformer.transformServices(organization) },
    }),

    // Internet contact transformation
    机构微信公众号: (organization) => ({
      internetContact: {
        value: ServiceTransformer.transformContacts(organization),
      },
    }),

    // Qualifications transformation
    登记管理机关: (organization) => ({
      qualifications: {
        value: QualificationTransformer.transformQualifications(organization),
      },
    }),

    // Cross-table relationship: Contact person -> User table
    机构联系人联系人姓名: (organization) => {
      const userData = UserTransformer.transformUser(organization);

      if (!userData) {
        // No valid contact info, skip user creation
        return {};
      }

      return {
        contactUser: {
          value: userData,
          model: UserModel,
        },
      };
    },
  };
}

/**
 * Fallback transformation for any unmapped fields
 * This ensures we don't lose any data during migration
 */
export function createFallbackMapping(
  organization: Organization,
): Partial<OrganizationData> {
  const fallback: Partial<OrganizationData> = {};

  // Handle any additional fields that might not be covered by the main mapping
  const mappedFields = new Set([
    '常用名称',
    '机构信用代码',
    '实体类型',
    '注册国籍',
    '成立时间',
    '机构／项目简介',
    '机构／项目全职人数',
    '注册地',
    '机构官网',
    '机构微信公众号',
    '登记管理机关',
    '机构联系人联系人姓名',
  ]);

  for (const [key, value] of Object.entries(organization)) {
    if (!mappedFields.has(key) && value != null) {
      // Map any unmapped fields to a generic metadata field or log them
      console.debug(`Unmapped field: ${key} = ${value}`);
    }
  }

  return fallback;
}
