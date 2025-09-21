/**
 * Migration mapping for MobX-RESTful-migrator
 */

import { MigrationSchema } from 'mobx-restful-migrator';
import {
  SourceOrganization,
  TargetOrganization,
  ExtendedUserData,
} from '../types';

import { AddressTransformer } from '../transformers/address-transformer';
import { DateTransformer } from '../transformers/date-transformer';
import { ServiceTransformer } from '../transformers/service-transformer';
import { QualificationTransformer } from '../transformers/qualification-transformer';
import { UserTransformer } from '../transformers/user-transformer';
import { DataUtils } from '../utils/data-utils';

import { TargetUserModel } from '../models/strapi-models';

export const migrationMapping: MigrationSchema<
  SourceOrganization,
  TargetOrganization
> = {
  常用名称: ({ 常用名称: value }) => ({
    name: { value: value || '', unique: true },
  }),

  机构信用代码: ({ 机构信用代码: value }) => ({
    code: { value: value || '' },
  }),

  实体类型: ({ 实体类型: value }) => ({
    entityType: { value: DataUtils.transformEntityType(value) },
  }),

  注册国籍: ({ 注册国籍: value }) => ({
    registrationCountry: { value: DataUtils.transformRegistrationCountry(value) },
  }),

  成立时间: ({ 成立时间: value }) => ({
    establishedDate: { value: DateTransformer.parseDate(value) },
  }),

  '机构／项目简介': ({ ['机构／项目简介']: value }) => {
    const desc = value || '';
    return {
      description: { value: DataUtils.cleanDescription(desc) },
      coverageArea: {
        value: ServiceTransformer.extractCoverageFromDescription(desc),
      },
    };
  },

  '机构／项目全职人数': ({ ['机构／项目全职人数']: value }) => ({
    staffCount: { value: DataUtils.parseStaffCount(value) },
  }),

  注册地: (org) => {
    const addressData = {
      province: AddressTransformer.extractProvinceFromAddress(
        org.注册地 || org.具体地址,
      ),
      city: AddressTransformer.extractCityFromAddress(
        org.注册地 || org.具体地址,
      ),
      district: AddressTransformer.extractDistrictFromAddress(
        org.注册地 || org.具体地址,
      ),
      street: org.具体地址 || '',
    };

    return {
      address: { value: AddressTransformer.transformAddress(addressData) },
    };
  },

  机构官网: (org) => ({
    services: { value: ServiceTransformer.transformServices(org) },
  }),

  机构微信公众号: (org) => ({
    internetContact: { value: ServiceTransformer.transformContacts(org) },
  }),

  登记管理机关: (org) => ({
    qualifications: {
      value: QualificationTransformer.transformQualifications(org),
    },
  }),

  机构联系人联系人姓名: (org) => {
    const userData = UserTransformer.transformUser(org);

    if (!userData) {
      return {};
    }

    return {
      contactUser: {
        value: userData,
        model: TargetUserModel,
      },
    };
  },
};
