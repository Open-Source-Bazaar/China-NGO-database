import { ReadableStream } from 'stream/web';
import * as XLSX from 'xlsx';

import { SourceOrganization } from '../types';

export class ExcelReader {
  static readExcelFile(filePath: string, sheetName?: string) {
    console.log(`读取 Excel 文件: ${filePath}`);

    const { SheetNames, Sheets } = XLSX.readFile(filePath);

    console.log(`发现工作表: ${SheetNames.join(', ')}`);

    // if not specified, use the first one
    const targetSheet = sheetName || SheetNames[0];

    if (!SheetNames.includes(targetSheet))
      throw new Error(`工作表 "${targetSheet}" 不存在`);

    console.log(`使用工作表: ${targetSheet}`);

    const worksheet = Sheets[targetSheet];

    return ReadableStream.from<SourceOrganization>(
      XLSX.stream.to_json(worksheet),
    );
  }
}
