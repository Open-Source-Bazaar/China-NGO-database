import { Address } from '../types';
import { DEFAULTS } from '../constants';

export class AddressTransformer {
  static transformAddress = (
    addressData?: Partial<Address>,
  ): Address | null => {
    if (!addressData) return null;

    return {
      country: addressData.country || DEFAULTS.COUNTRY,
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      street: addressData.street || '',
      building: addressData.building || '',
      floor: addressData.floor || '',
      room: addressData.room || '',
    };
  };

  static extractProvinceFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    // format: 北京市-市辖区-东城区-  or 甘肃省-兰州市-
    const parts = addressStr.split('-');
    if (parts.length > 0) {
      return parts[0].replace(/市$|省$/, '');
    }

    return '';
  }

  static extractCityFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 1) {
      return parts[1].replace(/市$/, '');
    }

    return '';
  }

  static extractDistrictFromAddress(addressStr?: string): string {
    if (!addressStr) return '';

    const parts = addressStr.split('-');
    if (parts.length > 2) {
      return parts[2].replace(/区$|县$/, '');
    }

    return '';
  }
}
