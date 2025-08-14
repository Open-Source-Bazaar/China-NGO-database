import { Service, InternetContact, Organization } from '../types';
import {
  SERVICE_CATEGORY_MAPPING,
  EDUCATION_FIELDS,
  TARGET_GROUP_FIELDS,
  COVERAGE_KEYWORDS,
  SERVICE_STATUS,
} from '../constants';

export class ServiceTransformer {
  static transformServices = (organization: Organization): Service[] => {
    const services: Service[] = [];

    // extract service information from various education related fields
    const educationServices = EDUCATION_FIELDS.filter(
      (field) => organization[field],
    ).map((field) => {
      const value = organization[field];
      // determine service category based on field type
      let serviceCategory = SERVICE_CATEGORY_MAPPING.其他;
      if (field.includes('早教'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.学前教育;
      else if (field.includes('义务教育'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.小学教育;
      else if (field.includes('高等教育'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.高等教育;
      else if (field.includes('特殊教育'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.特殊教育;
      else if (field.includes('支教'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.教师发展;
      else if (field.includes('助学'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.学生支持;
      else if (field.includes('技术支持'))
        serviceCategory = SERVICE_CATEGORY_MAPPING.教育硬件;

      return {
        serviceCategory,
        serviceContent: value,
        serviceTargets: this.extractTargetGroups(organization),
        supportMethods: value,
        projectStatus: SERVICE_STATUS.ONGOING,
        servesAllPopulation:
          organization['关于人群类服务对象服务全部人群'] === '是',
      };
    });

    services.push(...educationServices);

    // if no service information, create basic service based on industry service object
    if (services.length === 0 && organization[' 关于行业类服务对象']) {
      services.push({
        serviceCategory: SERVICE_CATEGORY_MAPPING.其他,
        serviceContent: organization[' 关于行业类服务对象'],
        serviceTargets: organization[' 关于行业类服务对象'],
        supportMethods: '',
        projectStatus: SERVICE_STATUS.ONGOING,
        servesAllPopulation: false,
      });
    }

    return services;
  };

  static extractTargetGroups = (organization: Organization) =>
    TARGET_GROUP_FIELDS.map((field) => organization[field])
      .filter(Boolean)
      .join('; ');

  static transformContacts(organization: Organization): InternetContact {
    const contact: InternetContact = {};

    // 官网
    const website =
      organization['机构官网'] || organization.internetContact?.website || '';

    if (website) contact.website = website;

    // 微信公众号
    const wechat = organization['机构微信公众号'];

    if (wechat) contact.wechatPublic = wechat;

    // 微博
    const weibo = organization['机构微博'];

    if (weibo) contact.weibo = weibo;

    return contact;
  }

  static extractCoverageFromDescription = (description = '') => {
    if (!description) return '';

    // extract coverage area from description (simple implementation)
    for (const keyword of COVERAGE_KEYWORDS)
      if (description.includes(keyword)) return keyword;

    return '';
  };
}
