/**
 * Utility to convert numeric amounts into English words in Birr and Cents.
 * Used for financial reports, invoice computation tables, VAT summaries, etc.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return TENS[ten] + (rest > 0 ? ' ' + ONES[rest] : '');
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return ONES[hundred] + ' Hundred' + (rest > 0 ? ' ' + convertBelowThousand(rest) : '');
}

export function numberToWords(num: number): string {
  if (isNaN(num) || !isFinite(num)) return 'Zero Birr';
  if (num === 0) return 'Zero Birr and Zero Cents';

  const absoluteVal = Math.abs(num);
  const integerPart = Math.floor(absoluteVal);
  const decimalPart = Math.round((absoluteVal - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Zero Birr and Zero Cents';
  }

  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  let tempInt = integerPart;
  let scaleIdx = 0;
  const parts: string[] = [];

  while (tempInt > 0) {
    const chunk = tempInt % 1000;
    if (chunk > 0) {
      const chunkStr = convertBelowThousand(chunk);
      const scaleName = scales[scaleIdx];
      parts.unshift(chunkStr + (scaleName ? ' ' + scaleName : ''));
    }
    tempInt = Math.floor(tempInt / 1000);
    scaleIdx++;
  }

  const intWords = parts.length > 0 ? parts.join(' ') : 'Zero';
  const mainFormatted = `${intWords} ${integerPart === 1 ? 'Birr' : 'Birr'}`;

  let centsFormatted = '';
  if (decimalPart > 0) {
    const centsWords = convertBelowThousand(decimalPart);
    centsFormatted = ` and ${centsWords} ${decimalPart === 1 ? 'Cent' : 'Cents'}`;
  } else {
    centsFormatted = ' and Zero Cents';
  }

  const prefix = num < 0 ? 'Minus ' : '';
  return `${prefix}${mainFormatted}${centsFormatted}`;
}
