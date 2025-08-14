import {
  ENTITY_TYPE_MAPPING,
  SERVICE_CATEGORY_MAPPING,
  COUNTRIES,
} from '../constants';

export class DataUtils {
  static transformEntityType = (entityType?: string) => {
    if (!entityType) return ENTITY_TYPE_MAPPING.其他;

    // handle keyword cases
    for (const [key, value] of Object.entries(ENTITY_TYPE_MAPPING))
      if (entityType.includes(key)) return value;

    return ENTITY_TYPE_MAPPING.其他;
  };

  static transformServiceCategory = (category = '') =>
    SERVICE_CATEGORY_MAPPING[category || ''] || SERVICE_CATEGORY_MAPPING.其他;

  static transformRegistrationCountry = (countryStr = '') =>
    countryStr.includes('国际') ? COUNTRIES.INTERNATIONAL : COUNTRIES.CHINA;

  static parseStaffCount(staffStr?: string | number): number {
    const [start, end] = staffStr?.toString().match(/(\d+)-(\d+)/) || [];

    return start
      ? end
        ? Math.floor((parseInt(start) + parseInt(end)) / 2)
        : parseInt(start)
      : 0;
  }

  static cleanDescription = (description = '') =>
    description?.replace(/\s+/g, ' ').trim().slice(0, 2000) || '';
}
