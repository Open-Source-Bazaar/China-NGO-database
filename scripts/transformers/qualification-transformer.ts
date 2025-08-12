import { Qualification, ExcelRow } from '../types';
import { QUALIFICATION_INDICATORS, QUALIFICATION_TYPES } from '../constants';

export class QualificationTransformer {
  static transformQualifications = (excelRow: ExcelRow): Qualification[] => {
    const qualifications: Qualification[] = [];

    // Check for various qualification indicators in the data
    for (const indicator of QUALIFICATION_INDICATORS) {
      if (excelRow[indicator]) {
        let qualificationType: (typeof QUALIFICATION_TYPES)[keyof typeof QUALIFICATION_TYPES] =
          QUALIFICATION_TYPES.NO_SPECIAL;

        if (indicator.includes('免税') || indicator.includes('税前扣除')) {
          qualificationType = QUALIFICATION_TYPES.TAX_DEDUCTION;
        } else if (indicator.includes('公开募捐')) {
          qualificationType = QUALIFICATION_TYPES.PUBLIC_FUNDRAISING;
        } else if (indicator.includes('慈善组织')) {
          qualificationType = QUALIFICATION_TYPES.TAX_EXEMPT;
        }

        qualifications.push({
          qualificationType,
          certificateName: indicator,
          issuingAuthority: '相关主管部门',
        });
      }
    }

    // Add general qualification if organization has any legal status
    if (excelRow['登记管理机关'] && qualifications.length === 0) {
      qualifications.push({
        qualificationType: QUALIFICATION_TYPES.NO_SPECIAL,
        certificateName: '社会组织登记证书',
        issuingAuthority: excelRow['登记管理机关'],
      });
    }

    return qualifications;
  };
}
