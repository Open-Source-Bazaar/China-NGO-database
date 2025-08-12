import * as XLSX from 'xlsx';
import * as fs from 'node:fs';

// Type definitions for data analysis
interface TypeAnalysisInfo {
  types: string[];
  sampleCount: number;
  totalCount: number;
  samples: any[];
}

type TypeAnalysisRecord = Record<string, TypeAnalysisInfo>;

// check excel file
const excelFile = '教育公益开放式数据库.xlsx';

if (!fs.existsSync(excelFile)) {
  console.log('当前目录:', process.cwd());
  console.log('目录内容:');
  for (const file of fs.readdirSync('.')) {
    console.log('  ', file);
  }
  throw new Error(`Excel文件不存在: ${excelFile}`);
}

try {
  // read excel file
  console.log('正在分析Excel文件: ', excelFile);
  const workbook = XLSX.readFile(excelFile);

  console.log(
    `\n=== sheet info ===\nsheet count: ${workbook.SheetNames.length}\nsheet names: ${workbook.SheetNames.join(', ')}`,
  );

  // analyze each sheet
  for (let index = 0; index < workbook.SheetNames.length; index++) {
    const sheetName = workbook.SheetNames[index];
    console.log(`\n=== sheet ${index + 1}: ${sheetName} ===`);

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('data row count:', data.length);

    if (data.length > 0) {
      console.log('\ncolumn names (fields):');
      const columns = Object.keys(data[0]);
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        console.log(`  ${i + 1}. ${col}`);
      }

      console.log('\nfirst 3 rows data example:');
      for (let i = 0; i < Math.min(3, data.length); i++) {
        const row = data[i];
        console.log(`\nrow ${i + 1}:`);
        for (const [key, value] of Object.entries(row)) {
          const displayValue =
            typeof value === 'string' && value.length > 50
              ? value.substring(0, 50) + '...'
              : value;
          console.log(`  ${key}: ${displayValue}`);
        }
      }

      // analyze data types
      console.log('\ndata types analysis:');
      const typeAnalysis: TypeAnalysisRecord = {};
      for (const col of columns) {
        const values = data
          .map((row) => row[col])
          .filter((v) => v !== undefined && v !== null && v !== '');
        const types = Array.from(new Set(values.map((v) => typeof v)));
        const sampleValues = values.slice(0, 3);
        typeAnalysis[col] = {
          types,
          sampleCount: values.length,
          totalCount: data.length,
          samples: sampleValues,
        };
      }

      for (const [col, info] of Object.entries(typeAnalysis)) {
        console.log(`  ${col}:`);
        console.log(`    types: ${info.types.join(', ')}`);
        console.log(`    sample count: ${info.sampleCount}/${info.totalCount}`);
        console.log(`    samples: ${info.samples.slice(0, 2).join(', ')}`);
      }
    }
  }
} catch (error) {
  console.error('analyze excel file failed:', error.message);

  // try to install xlsx package
  if (error.message.includes('Cannot find module')) {
    console.log('\nplease install xlsx package:');
    console.log('npm install xlsx');
  }
}
