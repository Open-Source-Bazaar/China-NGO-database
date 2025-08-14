import { OrganizationData, Organization } from '../types';
import { AddressTransformer } from './address-transformer';
import { DateTransformer } from './date-transformer';
import { ServiceTransformer } from './service-transformer';
import { QualificationTransformer } from './qualification-transformer';
import { DataUtils } from '../utils/data-utils';

export class DataTransformer {
  static transformOrganization = (
    organization: Organization,
  ): OrganizationData => ({
    name: organization['常用名称'] || organization.name || '',
    code: organization['机构信用代码'] || organization.code || '',
    entityType: DataUtils.transformEntityType(
      organization['实体类型'] || organization.entityType,
    ),
    registrationCountry: DataUtils.transformRegistrationCountry(
      organization['注册国籍'] || organization.registrationCountry,
    ),
    establishedDate: DateTransformer.parseDate(
      organization['成立时间'] || organization.establishedDate,
    ),
    coverageArea: ServiceTransformer.extractCoverageFromDescription(
      organization['机构／项目简介'] || organization.description,
    ),
    description: DataUtils.cleanDescription(
      organization['机构／项目简介'] || organization.description || '',
    ),
    staffCount: DataUtils.parseStaffCount(
      organization['机构／项目全职人数'] || organization.staffCount,
    ),
    address: AddressTransformer.transformAddress({
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
    }),
    services: ServiceTransformer.transformServices(organization),
    internetContact: ServiceTransformer.transformContacts(organization),
    qualifications:
      QualificationTransformer.transformQualifications(organization),
    publishedAt: new Date().toISOString(),
  });
}
