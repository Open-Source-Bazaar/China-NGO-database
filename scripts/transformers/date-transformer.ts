import { Day } from 'web-utility';

export class DateTransformer {
  static parseDate(dateStr?: string | number): string | null {
    if (!dateStr) return null;

    // 确保 dateStr 是字符串
    const dateString = String(dateStr).trim();
    if (!dateString) return null;

    // 如果是数字，可能是 Excel 的序列号或年份
    if (/^\d+$/.test(dateString)) {
      const num = parseInt(dateString);

      // 如果是4位数，当作年份处理
      if (num >= 1900 && num <= 2100) return `${num}-01-01`;

      // 如果是 Excel 序列号（通常大于 25000），转换为日期
      if (num > 25000)
        try {
          // Excel 日期从 1900-01-01 开始计算（但需要减去1，因为Excel错误地认为1900年是闰年）
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (num - 2) * Day);
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.warn(`Excel日期序列号转换失败: ${dateString}`);
          return null;
        }
    }

    // handle chinese date format: 2015年6月3日
    const [, year, , , month = '1', , day = '1'] =
      dateString.match(/(\d{4})(年((\d{1,2})月((\d{1,2})日)?)?)?/) || [];

    if (year)
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // try to parse directly
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`日期解析失败: ${dateString}`);
      return null;
    }
  }
}
