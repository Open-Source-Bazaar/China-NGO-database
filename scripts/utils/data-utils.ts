import {
  ENTITY_TYPE_MAPPING,
  SERVICE_CATEGORY_MAPPING,
  COUNTRIES,
} from '../constants';

export class DataUtils {
  static transformEntityType = (entityType?: string): string => {
    if (!entityType) return ENTITY_TYPE_MAPPING.其他;

    // handle keyword cases
    for (const [key, value] of Object.entries(ENTITY_TYPE_MAPPING)) {
      if (entityType.includes(key)) {
        return value;
      }
    }

    return ENTITY_TYPE_MAPPING.其他;
  };

  static transformServiceCategory = (category?: string): string => {
    return (
      SERVICE_CATEGORY_MAPPING[category || ''] || SERVICE_CATEGORY_MAPPING.其他
    );
  };

  static transformRegistrationCountry = (countryStr = '') =>
    countryStr.includes('国际') ? COUNTRIES.INTERNATIONAL : COUNTRIES.CHINA;

  static parseStaffCount(staffStr?: string | number): number {
    if (!staffStr) return 0;

    // extract numbers
    const match = staffStr.toString().match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }

    // handle range
    if (staffStr.toString().includes('-')) {
      const range = staffStr.toString().match(/(\d+)-(\d+)/);
      if (range) {
        return Math.floor((parseInt(range[1]) + parseInt(range[2])) / 2);
      }
    }

    return 0;
  }

  static cleanDescription(description?: string): string {
    if (!description) return '';

    // clean description text, remove extra spaces and newlines
    return description
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 2000); // limit length
  }
}
