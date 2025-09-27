import { MigrationSchema, TargetPatch } from 'mobx-restful-migrator';

import { SourceOrganization, TargetOrganization } from '../types';
import { AddressTransformer } from './address-transformer';
import { DateTransformer } from './date-transformer';
import { ServiceTransformer } from './service-transformer';
import { QualificationTransformer } from './qualification-transformer';
import { UserTransformer } from './user-transformer';
import { DataUtils } from '../utils/data-utils';
import { TargetUserModel } from '../utils/strapi-api';

export const migrationMapping: MigrationSchema<
  SourceOrganization,
  TargetOrganization
> = {
  常用名称: ({ 常用名称: value }) => ({ name: { value, unique: true } }),
  机构信用代码: 'code',
  实体类型: ({ 实体类型: value }) => ({
    entityType: { value: DataUtils.transformEntityType(value) },
  }),
  注册国籍: ({ 注册国籍: value }) => ({
    registrationCountry: {
      value: DataUtils.transformRegistrationCountry(value),
    },
  }),
  成立时间: ({ 成立时间: value }) => ({
    establishedDate: { value: DateTransformer.parseDate(value) },
  }),
  '机构／项目简介': ({ ['机构／项目简介']: value }) => {
    value ||= '';
    return {
      description: { value: DataUtils.cleanDescription(value) },
      coverageArea: {
        value: ServiceTransformer.extractCoverageFromDescription(value),
      },
    };
  },
  '机构／项目全职人数': ({ ['机构／项目全职人数']: value }) => ({
    staffCount: { value: DataUtils.parseStaffCount(value) },
  }),
  注册地: ({ 注册地, 具体地址 }) => {
    const addressData = {
      province: AddressTransformer.extractProvinceFromAddress(
        注册地 || 具体地址,
      ),
      city: AddressTransformer.extractCityFromAddress(注册地 || 具体地址),
      district: AddressTransformer.extractDistrictFromAddress(
        注册地 || 具体地址,
      ),
      street: 具体地址 || '',
    };
    return {
      address: { value: AddressTransformer.transformAddress(addressData) },
    };
  },
  机构官网: (row) => ({
    services: { value: ServiceTransformer.transformServices(row) },
  }),
  机构微信公众号: (row) => ({
    internetContact: { value: ServiceTransformer.transformContacts(row) },
  }),
  登记管理机关: (org) => ({
    qualifications: {
      value: QualificationTransformer.transformQualifications(org),
    },
  }),
  机构联系人联系人姓名: (org) => {
    const value = UserTransformer.transformUser(org);

    return (
      !value ? {} : { contactUser: { value, model: TargetUserModel } }
    ) as TargetPatch<TargetOrganization>;
  },
};
