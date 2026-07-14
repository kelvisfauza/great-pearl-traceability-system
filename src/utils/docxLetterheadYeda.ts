import {
  Table, TableRow, TableCell, Paragraph, TextRun, ImageRun,
  WidthType, BorderStyle, AlignmentType, ShadingType,
} from 'docx';
import yedaLogo from '@/assets/yeda-logo.png.asset.json';

// YEDA brand
export const YEDA_NAME = 'YEDA';
export const YEDA_FULL = 'COFFEE COMPANY';
export const YEDA_SUB = 'LIMITED';
export const YEDA_TAGLINE = 'Quality Coffee.  Stronger Future.';
export const YEDA_ADDRESS = 'P.O. Box 431420,\nKasese, Uganda';
export const YEDA_PHONE = '+256 393 001 626';
export const YEDA_EMAIL = 'info@yedacoffee.com';
export const YEDA_WEBSITE = 'www.yedacoffee.com';

const GREEN = '0d3d1f';
const GOLD = 'b8862b';
const MUTED = '555555';

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
};

export const fetchYedaLogoBytes = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(yedaLogo.url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
};

const contactRow = (icon: string, lines: string[]) => new TableRow({
  children: [
    new TableCell({
      width: { size: 400, type: WidthType.DXA },
      borders: noBorders,
      margins: { top: 30, bottom: 30, left: 0, right: 80 },
      verticalAlign: 'center' as any,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: icon, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })],
        shading: { fill: GREEN, type: ShadingType.CLEAR, color: 'auto' } as any,
      })],
      shading: { fill: GREEN, type: ShadingType.CLEAR, color: 'auto' },
    }),
    new TableCell({
      width: { size: 2600, type: WidthType.DXA },
      borders: noBorders,
      margins: { top: 30, bottom: 30, left: 120, right: 0 },
      verticalAlign: 'center' as any,
      children: lines.map(l => new Paragraph({
        children: [new TextRun({ text: l, size: 18, font: 'Arial', color: '222222' })],
      })),
    }),
  ],
});

/** YEDA header: circular logo | title block | vertical rule | contact column */
export const createYedaHeader = (logoBytes: Uint8Array | null): Table => {
  const logoCell = new TableCell({
    width: { size: 1500, type: WidthType.DXA },
    borders: noBorders,
    verticalAlign: 'center' as any,
    margins: { top: 60, bottom: 60, left: 0, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: logoBytes
        ? [new ImageRun({
            type: 'png',
            data: logoBytes,
            transformation: { width: 90, height: 90 },
            altText: { title: 'YEDA', description: 'YEDA Coffee seal', name: 'yeda' },
          })]
        : [new TextRun({ text: 'YEDA', bold: true, size: 32, color: GREEN, font: 'Georgia' })],
    })],
  });

  const titleCell = new TableCell({
    width: { size: 4860, type: WidthType.DXA },
    borders: { ...noBorders, right: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    verticalAlign: 'center' as any,
    margins: { top: 60, bottom: 60, left: 60, right: 200 },
    children: [
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({
          text: 'YEDA', bold: true, size: 72, font: 'Georgia', color: GREEN,
        })],
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({
          text: 'COFFEE COMPANY', bold: true, size: 24, font: 'Georgia', color: GREEN,
          characterSpacing: 40,
        })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '\u2014  ', color: GOLD, bold: true }),
          new TextRun({ text: 'LIMITED', bold: true, size: 20, font: 'Georgia', color: GREEN, characterSpacing: 60 }),
          new TextRun({ text: '  \u2014', color: GOLD, bold: true }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({
          text: YEDA_TAGLINE, italics: true, size: 18, font: 'Georgia', color: MUTED,
        })],
      }),
    ],
  });

  const contactTable = new Table({
    width: { size: 3000, type: WidthType.DXA },
    columnWidths: [400, 2600],
    borders: noBorders,
    rows: [
      contactRow('\u25CF', ['P.O. Box 431420,', 'Kasese, Uganda']),
      contactRow('\u260E', [YEDA_PHONE]),
      contactRow('\u2709', [YEDA_EMAIL]),
      contactRow('\u2318', [YEDA_WEBSITE]),
    ],
  });

  const contactCell = new TableCell({
    width: { size: 3000, type: WidthType.DXA },
    borders: noBorders,
    verticalAlign: 'center' as any,
    margins: { top: 60, bottom: 60, left: 200, right: 0 },
    children: [contactTable],
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1500, 4860, 3000],
    borders: noBorders,
    rows: [new TableRow({ children: [logoCell, titleCell, contactCell] })],
  });
};

/** Slim green + gold accent bar under the header */
export const createYedaAccentBar = (): Table => {
  const bar = (fill: string, w: number) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: noBorders,
    shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
    children: [new Paragraph({ children: [new TextRun({ text: ' ', size: 8 })] })],
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 800, 6160],
    borders: noBorders,
    rows: [new TableRow({
      height: { value: 140, rule: 'exact' as any },
      children: [bar(GREEN, 2400), bar(GOLD, 800), bar('FFFFFF', 6160)],
    })],
  });
};

/** YEDA footer: dark-green band with Mission / Vision / Values in three columns */
export const createYedaFooter = (): Table => {
  const col = (title: string, body: string[]) => new TableCell({
    width: { size: 3120, type: WidthType.DXA },
    borders: noBorders,
    shading: { fill: GREEN, type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 200, bottom: 200, left: 200, right: 200 },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: '\u25CF  ', color: GOLD, bold: true, size: 20 }),
          new TextRun({ text: title, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' }),
        ],
      }),
      ...body.map(line => new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: line, color: 'FFFFFF', size: 16, font: 'Arial' })],
      })),
    ],
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    borders: noBorders,
    rows: [new TableRow({
      children: [
        col('Our Mission', [
          'To produce and deliver',
          'sustainable quality coffee',
          'that creates value for',
          'farmers and the world.',
        ]),
        col('Our Vision', [
          'To be a leading coffee',
          'company recognized',
          'for quality, integrity and',
          'impact.',
        ]),
        col('Our Values', [
          'Integrity  |  Quality',
          'Teamwork  |  Sustainability',
          'Accountability  |  Innovation',
        ]),
      ],
    })],
  });
};

export const yedaSpacer = (size = 100) =>
  new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun({ text: '' })] });