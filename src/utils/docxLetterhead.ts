import {
  Table, TableRow, TableCell, Paragraph, TextRun, ImageRun,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';
import {
  LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS,
  COMPANY_PHONE, COMPANY_PHONE_OPS, COMPANY_EMAIL, COMPANY_SUPPORT_EMAIL, COMPANY_WEBSITE, COMPANY_REG, COMPANY_REG_INC,
} from './companyBrand';

export const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
export const noBorders = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
};
export const thinBlack = { style: BorderStyle.SINGLE, size: 6, color: '000000' };

export const fetchLogoBytes = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
};

/**
 * Standard letterhead header: logo on the left, company name + tagline beside it,
 * with a single bottom rule. Matches the official Word letterhead style.
 */
export const createLetterheadHeader = (logoBytes: Uint8Array | null): Table => {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 1200, type: WidthType.DXA },
        borders: { ...noBorders, bottom: thinBlack },
        verticalAlign: 'center' as any,
        margins: { top: 120, bottom: 120, left: 0, right: 200 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: logoBytes
              ? [new ImageRun({
                  type: 'png',
                  data: logoBytes,
                  transformation: { width: 70, height: 70 },
                  altText: { title: 'Logo', description: 'GAC Logo', name: 'logo' },
                })]
              : [new TextRun({ text: 'GAC', bold: true, size: 32 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 8160, type: WidthType.DXA },
        borders: { ...noBorders, bottom: thinBlack },
        verticalAlign: 'center' as any,
        margins: { top: 120, bottom: 120, left: 0, right: 0 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: COMPANY_NAME, bold: true, size: 36, font: 'Arial', color: '0d3d1f' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: COMPANY_TAGLINE, size: 18, font: 'Arial', color: '555555', italics: true }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 8160],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [headerRow],
  });
};

/**
 * Registration line shown directly under the header rule.
 * Defaults to the registration number only (no incorporation date).
 */
export const createLetterheadRegLine = (includeIncorporated = false): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
    children: [new TextRun({ text: includeIncorporated ? COMPANY_REG_INC : COMPANY_REG, size: 16, color: '555555' })],
  });

/**
 * Standard letterhead footer: 4-column contact block with a top rule and a
 * centered registration line below. The footer keeps the incorporation date by
 * default, since the user only asked to remove it from the header.
 */
export const createLetterheadFooter = (includeIncorporated = true): Table => {
  const footCell = (heading: string, value: string, align: any = AlignmentType.LEFT) => new TableCell({
    width: { size: 2340, type: WidthType.DXA },
    borders: { ...noBorders, top: thinBlack },
    margins: { top: 120, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({ alignment: align, children: [new TextRun({ text: heading, bold: true, size: 18 })] }),
      new Paragraph({ alignment: align, children: [new TextRun({ text: value, size: 18 })] }),
    ],
  });

  const phoneCell = new TableCell({
    width: { size: 2340, type: WidthType.DXA },
    borders: { ...noBorders, top: thinBlack },
    margins: { top: 120, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({ children: [new TextRun({ text: 'Telephone', bold: true, size: 18 })] }),
      new Paragraph({ children: [new TextRun({ text: COMPANY_PHONE, size: 18 })] }),
      new Paragraph({ children: [new TextRun({ text: `Operations: ${COMPANY_PHONE_OPS}`, size: 18 })] }),
    ],
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2340, type: WidthType.DXA },
            borders: { ...noBorders, top: thinBlack },
            margins: { top: 120, bottom: 60, left: 0, right: 80 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Great Agro Coffee', bold: true, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: COMPANY_ADDRESS, size: 18 })] }),
            ],
          }),
          phoneCell,
          footCell('Email', COMPANY_EMAIL),
          footCell('Customer Support', COMPANY_SUPPORT_EMAIL),
          footCell('Website', COMPANY_WEBSITE),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            columnSpan: 4,
            borders: noBorders,
            margins: { top: 60, bottom: 0, left: 0, right: 0 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: includeIncorporated ? COMPANY_REG_INC : COMPANY_REG, size: 16, color: '666666' })],
            })],
          }),
        ],
      }),
    ],
  });
};

export const letterheadSpacer = (size = 100) =>
  new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun({ text: '' })] });
