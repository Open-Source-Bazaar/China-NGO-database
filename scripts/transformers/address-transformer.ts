import { Address } from '../types';
import { DEFAULTS } from '../constants';

export class AddressTransformer {
  static transformAddress = (addressData?: Partial<Address>) =>
    addressData && {
      country: addressData.country || DEFAULTS.COUNTRY,
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      street: addressData.street || '',
      building: addressData.building || '',
      floor: addressData.floor || '',
      room: addressData.room || '',
    };

  static extractProvinceFromAddress = (addressStr = '') =>
    addressStr?.split('-')[0]?.replace(/市$|省$/, '') || '';

  static extractCityFromAddress = (addressStr = '') =>
    addressStr?.split('-')[1]?.replace(/市$/, '') || '';

  static extractDistrictFromAddress = (addressStr = '') =>
    addressStr?.split('-')[2]?.replace(/区$|县$/, '') || '';
}
