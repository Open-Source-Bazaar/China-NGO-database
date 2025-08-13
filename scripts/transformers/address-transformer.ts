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

  static extractProvinceFromAddress = (addressStr = '') => {
    if (!addressStr) return '';
    const parts = addressStr.split('-');
    return parts[0] ? parts[0].replace(/市$|省$/, '') : '';
  };

  static extractCityFromAddress = (addressStr = '') => {
    if (!addressStr) return '';
    const parts = addressStr.split('-');
    return parts[1] ? parts[1].replace(/市$/, '') : '';
  };

  static extractDistrictFromAddress = (addressStr = '') => {
    if (!addressStr) return '';
    const parts = addressStr.split('-');
    return parts[2] ? parts[2].replace(/区$|县$/, '') : '';
  };
}
