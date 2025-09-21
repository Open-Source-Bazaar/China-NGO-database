import * as XLSX from 'xlsx';
import { SourceOrganization } from '../types';

export class ExcelReader {
  static readExcelFile(
    filePath: string,
    sheetName: string | null = null,
  ): SourceOrganization[] {
    console.log(`读取 Excel 文件: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    console.log(`发现工作表: ${workbook.SheetNames.join(', ')}`);

    // if not specified, use the first one
    const targetSheet = sheetName || workbook.SheetNames[0];

    if (!workbook.SheetNames.includes(targetSheet)) {
      throw new Error(`工作表 "${targetSheet}" 不存在`);
    }

    console.log(`使用工作表: ${targetSheet}`);

    const worksheet = workbook.Sheets[targetSheet];
    const data: SourceOrganization[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`成功读取 ${data.length} 行数据`);

    // show data overview
    if (data.length > 0) {
      console.log(`数据字段: ${Object.keys(data[0]).length} 个`);
      console.log(
        `示例字段: ${Object.keys(data[0]).slice(0, 5).join(', ')}...`,
      );
    }

    return data;
  }

  static getSheetNames(filePath: string): string[] {
    const { SheetNames } = XLSX.readFile(filePath);
    return SheetNames;
  }
}
