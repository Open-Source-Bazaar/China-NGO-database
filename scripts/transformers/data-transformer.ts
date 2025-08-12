import { OrganizationData, ExcelRow } from '../types';
import { AddressTransformer } from './address-transformer';
import { DateTransformer } from './date-transformer';
import { ServiceTransformer } from './service-transformer';
import { QualificationTransformer } from './qualification-transformer';
import { DataUtils } from '../utils/data-utils';

export class DataTransformer {
  static transformOrganization(excelRow: ExcelRow): OrganizationData {
    return {
      name: excelRow['常用名称'] || excelRow.name || '',
      code: excelRow['机构信用代码'] || excelRow.code || '',
      entityType: DataUtils.transformEntityType(
        excelRow['实体类型'] || excelRow.entityType,
      ),
      registrationCountry: DataUtils.transformRegistrationCountry(
        excelRow['注册国籍'] || excelRow.registrationCountry,
      ),
      establishedDate: DateTransformer.parseDate(
        excelRow['成立时间'] || excelRow.establishedDate,
      ),
      coverageArea: ServiceTransformer.extractCoverageFromDescription(
        excelRow['机构／项目简介'] || excelRow.description,
      ),
      description: DataUtils.cleanDescription(
        excelRow['机构／项目简介'] || excelRow.description || '',
      ),
      staffCount: DataUtils.parseStaffCount(
        excelRow['机构／项目全职人数'] || excelRow.staffCount,
      ),
      address: AddressTransformer.transformAddress({
        province: AddressTransformer.extractProvinceFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        city: AddressTransformer.extractCityFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        district: AddressTransformer.extractDistrictFromAddress(
          excelRow['注册地'] || excelRow['具体地址'],
        ),
        street: excelRow['具体地址'] || excelRow.street || '',
      }),
      services: ServiceTransformer.transformServices(excelRow),
      internetContact: ServiceTransformer.transformContacts(excelRow),
      qualifications:
        QualificationTransformer.transformQualifications(excelRow),
      publishedAt: new Date().toISOString(),
    };
  }
}
