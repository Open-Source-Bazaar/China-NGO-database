const XLSX = require('xlsx');
const fs = require('fs');

// check excel file
const excelFile = '教育公益开放式数据库.xlsx';

if (!fs.existsSync(excelFile)) {
  console.log('Excel文件不存在:', excelFile);
  console.log('当前目录:', process.cwd());
  console.log('目录内容:');
  fs.readdirSync('.').forEach((file) => {
    console.log('  ', file);
  });
  process.exit(1);
}

try {
  // read excel file
  console.log('正在分析Excel文件:', excelFile);
  const workbook = XLSX.readFile(excelFile);

  console.log('\n=== sheet info ===');
  console.log('sheet count:', workbook.SheetNames.length);
  console.log('sheet names:', workbook.SheetNames);

  // analyze each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n=== sheet ${index + 1}: ${sheetName} ===`);

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('data row count:', data.length);

    if (data.length > 0) {
      console.log('\ncolumn names (fields):');
      const columns = Object.keys(data[0]);
      columns.forEach((col, i) => {
        console.log(`  ${i + 1}. ${col}`);
      });

      console.log('\nfirst 3 rows data example:');
      data.slice(0, 3).forEach((row, i) => {
        console.log(`\nrow ${i + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          const displayValue =
            typeof value === 'string' && value.length > 50
              ? value.substring(0, 50) + '...'
              : value;
          console.log(`  ${key}: ${displayValue}`);
        });
      });

      // analyze data types
      console.log('\ndata types analysis:');
      const typeAnalysis = {};
      columns.forEach((col) => {
        const values = data
          .map((row) => row[col])
          .filter((v) => v !== undefined && v !== null && v !== '');
        const types = [...new Set(values.map((v) => typeof v))];
        const sampleValues = values.slice(0, 3);
        typeAnalysis[col] = {
          types,
          sampleCount: values.length,
          totalCount: data.length,
          samples: sampleValues,
        };
      });

      Object.entries(typeAnalysis).forEach(([col, info]) => {
        console.log(`  ${col}:`);
        console.log(`    types: ${info.types.join(', ')}`);
        console.log(`    sample count: ${info.sampleCount}/${info.totalCount}`);
        console.log(`    samples: ${info.samples.slice(0, 2).join(', ')}`);
      });
    }
  });
} catch (error) {
  console.error('analyze excel file failed:', error.message);

  // try to install xlsx package
  if (error.message.includes('Cannot find module')) {
    console.log('\nplease install xlsx package:');
    console.log('npm install xlsx');
  }
}
