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
    name: organization.name || '',
    code: organization.code || '',
    entityType: DataUtils.transformEntityType(organization.entityType),
    registrationCountry: DataUtils.transformRegistrationCountry(
      organization.registrationCountry,
    ),
    establishedDate: DateTransformer.parseDate(organization.establishedDate),
    coverageArea: ServiceTransformer.extractCoverageFromDescription(
      organization.description,
    ),
    description: DataUtils.cleanDescription(organization.description || ''),
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
      street: organization['具体地址'] || organization.street || '',
    }),
    services: ServiceTransformer.transformServices(organization),
    internetContact: ServiceTransformer.transformContacts(organization),
    qualifications:
      QualificationTransformer.transformQualifications(organization),
    publishedAt: new Date().toISOString(),
  });
}
