import * as XLSX from 'xlsx';

export interface ParsedMcqRow {
  questionKey: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  displayOrder: number;
}

export interface ImportRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportParseResult {
  validQuestions: ParsedMcqRow[];
  errors: ImportRowError[];
  totalRows: number;
  duplicateCount: number;
  rawRows: Record<string, any>[];
}

const QUESTION_ALIASES = [
  'question_text',
  'question',
  'q',
  'prompt',
  'text',
  'stem',
  'question_body',
  'ques',
  'title',
];
const OPT_A_ALIASES = ['option_a', 'a', 'option1', 'opt_a', 'opt1'];
const OPT_B_ALIASES = ['option_b', 'b', 'option2', 'opt_b', 'opt2'];
const OPT_C_ALIASES = ['option_c', 'c', 'option3', 'opt_c', 'opt3'];
const OPT_D_ALIASES = ['option_d', 'd', 'option4', 'opt_d', 'opt4'];
const CORRECT_ALIASES = [
  'correct_option',
  'correct',
  'answer',
  'ans',
  'right_option',
  'correct_answer',
  'answer_key',
  'ans_key',
];
const EXPLANATION_ALIASES = [
  'explanation',
  'solution',
  'hint',
  'reason',
  'rationale',
  'note',
];
const KEY_ALIASES = ['question_key', 'key', 'id', 'qno', 'q_no', 'sr_no', 'sno'];

export const McqImportParser = {
  sampleCsvTemplate:
    'question_key,question_text,option_a,option_b,option_c,option_d,correct_option,explanation\n' +
    'Q1,"Which article of the Indian Constitution deals with the Right to Equality?",Article 12,Article 14,Article 19,Article 21,B,"Article 14 guarantees equality before law and equal protection of the laws."\n' +
    'Q2,"What is the maximum weight limit for an Inland Letter Card in India Post?",3 grams,5 grams,10 grams,15 grams,B,"An Inland Letter Card has a maximum permissible weight limit of 5 grams."\n',

  sampleJsonTemplate: JSON.stringify(
    [
      {
        question_key: 'Q1',
        question_text:
          'Which article of the Indian Constitution deals with the Right to Equality?',
        option_a: 'Article 12',
        option_b: 'Article 14',
        option_c: 'Article 19',
        option_d: 'Article 21',
        correct_option: 'B',
        explanation:
          'Article 14 guarantees equality before law and equal protection of the laws.',
      },
    ],
    null,
    2
  ),

  parseCsvMatrix(rawText: string): string[][] {
    const text = rawText.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (ch === '\r' || ch === '\n') {
          if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
            i++;
          }
          currentRow.push(currentField.trim());
          currentField = '';
          if (currentRow.some((cell) => cell.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentField += ch;
        }
      }
    }

    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
    return rows;
  },

  parseAndValidateCsv(csvText: string, preferredLang = 'en'): ImportParseResult {
    const matrix = this.parseCsvMatrix(csvText);
    if (matrix.length < 2) {
      return {
        validQuestions: [],
        errors: [
          {
            rowNumber: 1,
            field: 'file',
            message: 'CSV must include a header row and at least one question row.',
          },
        ],
        totalRows: 0,
        duplicateCount: 0,
        rawRows: [],
      };
    }

    const headers = matrix[0].map((h) => h.trim().toLowerCase());
    const records: Record<string, any>[] = [];
    for (let r = 1; r < matrix.length; r++) {
      const cells = matrix[r];
      const map: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        map[headers[c]] = c < cells.length ? cells[c] : '';
      }
      records.push(map);
    }
    return this.validateAndNormalize(records, preferredLang);
  },

  parseAndValidateJson(jsonText: string, preferredLang = 'en'): ImportParseResult {
    try {
      const decoded = JSON.parse(jsonText.replace(/^\uFEFF/, ''));
      let list: any[] | null = null;
      if (Array.isArray(decoded)) {
        list = decoded;
      } else if (decoded && typeof decoded === 'object') {
        for (const key of ['questions', 'items', 'mcqs', 'data', 'records']) {
          if (Array.isArray(decoded[key])) {
            list = decoded[key];
            break;
          }
        }
      }

      if (!list) {
        return {
          validQuestions: [],
          errors: [
            {
              rowNumber: 1,
              field: 'json',
              message:
                'JSON root must be an array of question objects or contain a "questions" array.',
            },
          ],
          totalRows: 0,
          duplicateCount: 0,
          rawRows: [],
        };
      }

      const records = list.filter((e) => e && typeof e === 'object');
      return this.validateAndNormalize(records, preferredLang);
    } catch (e: any) {
      return {
        validQuestions: [],
        errors: [
          {
            rowNumber: 1,
            field: 'json',
            message: `Invalid JSON syntax: ${e?.message ?? String(e)}`,
          },
        ],
        totalRows: 0,
        duplicateCount: 0,
        rawRows: [],
      };
    }
  },

  parseAndValidateExcel(base64OrBytes: string | ArrayBuffer | Uint8Array, preferredLang = 'en'): ImportParseResult {
    try {
      const workbook = XLSX.read(base64OrBytes, {
        type: typeof base64OrBytes === 'string' ? 'base64' : 'array',
      });
      if (!workbook.SheetNames.length) {
        return {
          validQuestions: [],
          errors: [{ rowNumber: 1, field: 'excel', message: 'Excel workbook contains no sheets.' }],
          totalRows: 0,
          duplicateCount: 0,
          rawRows: [],
        };
      }
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
      if (!rows.length) {
        return {
          validQuestions: [],
          errors: [
            {
              rowNumber: 1,
              field: 'excel',
              message: 'Excel sheet must contain headers and at least one row.',
            },
          ],
          totalRows: 0,
          duplicateCount: 0,
          rawRows: [],
        };
      }
      return this.validateAndNormalize(rows, preferredLang);
    } catch (e: any) {
      return {
        validQuestions: [],
        errors: [
          {
            rowNumber: 1,
            field: 'excel',
            message: `Could not read Excel file: ${e?.message ?? String(e)}`,
          },
        ],
        totalRows: 0,
        duplicateCount: 0,
        rawRows: [],
      };
    }
  },

  normalizeCorrectOption(raw: string): 'A' | 'B' | 'C' | 'D' | null {
    const clean = raw.trim().toUpperCase().replace(/[\s_]+/g, ' ');
    switch (clean) {
      case 'A':
      case '1':
      case 'OPTION A':
      case 'OPT A':
        return 'A';
      case 'B':
      case '2':
      case 'OPTION B':
      case 'OPT B':
        return 'B';
      case 'C':
      case '3':
      case 'OPTION C':
      case 'OPT C':
        return 'C';
      case 'D':
      case '4':
      case 'OPTION D':
      case 'OPT D':
        return 'D';
      default:
        return null;
    }
  },

  _normalizeLang(lang: string): string {
    const lower = lang.trim().toLowerCase();
    if (lower.startsWith('te')) return 'te';
    if (lower.startsWith('hi')) return 'hi';
    if (lower.startsWith('ta')) return 'ta';
    return lower || 'en';
  },

  _langPriority(preferredLang: string): string[] {
    const primary = this._normalizeLang(preferredLang);
    const langs = [primary];
    for (const fallback of ['en', 'english', 'te', 'telugu', 'hi', 'hindi', 'ta', 'tamil']) {
      if (!langs.includes(fallback)) langs.push(fallback);
    }
    return langs;
  },

  _unwrapLocalizedValue(raw: any, langs: string[]): string {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim();
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const lower: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        lower[k.trim().toLowerCase()] = v;
      }
      for (const l of langs) {
        if (l in lower) {
          const v = this._unwrapLocalizedValue(lower[l], langs);
          if (v) return v;
        }
      }
      for (const key of ['text', 'label', 'value', 'title', 'name', 'content']) {
        if (key in lower) {
          const v = this._unwrapLocalizedValue(lower[key], langs);
          if (v) return v;
        }
      }
      for (const entry of Object.values(lower)) {
        const v = this._unwrapLocalizedValue(entry, langs);
        if (v) return v;
      }
    }
    return '';
  },

  _mergeLocalizedContainer(lowerRow: Record<string, any>, langs: string[]): Record<string, any> {
    const merged: Record<string, any> = { ...lowerRow };
    const mergeFrom = (container: any) => {
      if (!container || typeof container !== 'object' || Array.isArray(container)) return;
      const sub: Record<string, any> = {};
      for (const [k, v] of Object.entries(container)) {
        sub[k.trim().toLowerCase()] = v;
      }
      for (const l of langs) {
        if (sub[l] && typeof sub[l] === 'object' && !Array.isArray(sub[l])) {
          for (const [k, v] of Object.entries(sub[l])) {
            const lk = k.trim().toLowerCase();
            if (!(lk in merged)) merged[lk] = v;
          }
          break;
        }
      }
    };

    mergeFrom(lowerRow);
    mergeFrom(lowerRow.translations);
    mergeFrom(lowerRow.languages);
    mergeFrom(lowerRow.content);
    mergeFrom(lowerRow.localized);
    return merged;
  },

  _pickLocalizedField(row: Record<string, any>, aliases: string[], langs: string[]): string {
    for (const alias of aliases) {
      if (alias in row) {
        const v = this._unwrapLocalizedValue(row[alias], langs);
        if (v) return v;
      }
    }
    for (const l of langs) {
      for (const alias of aliases) {
        for (const key of [`${alias}_${l}`, `${l}_${alias}`, `${alias}.${l}`, `${alias}-${l}`]) {
          if (key in row) {
            const v = this._unwrapLocalizedValue(row[key], langs);
            if (v) return v;
          }
        }
      }
    }
    return '';
  },

  _extractOptionsFromCollection(raw: any, langs: string[]): [string, string, string, string] {
    if (!raw) return ['', '', '', ''];
    if (Array.isArray(raw)) {
      const out: [string, string, string, string] = ['', '', '', ''];
      for (let i = 0; i < raw.length && i < 4; i++) {
        out[i] = this._unwrapLocalizedValue(raw[i], langs);
      }
      return out;
    }
    if (typeof raw === 'object') {
      const lower: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        lower[k.trim().toLowerCase()] = v;
      }
      const dA = this._pickLocalizedField(lower, OPT_A_ALIASES, langs);
      const dB = this._pickLocalizedField(lower, OPT_B_ALIASES, langs);
      const dC = this._pickLocalizedField(lower, OPT_C_ALIASES, langs);
      const dD = this._pickLocalizedField(lower, OPT_D_ALIASES, langs);
      if (dA || dB || dC || dD) return [dA, dB, dC, dD];

      if ('1' in lower || '2' in lower || '3' in lower || '4' in lower) {
        return [
          this._unwrapLocalizedValue(lower['1'] ?? lower['0'], langs),
          this._unwrapLocalizedValue(lower['2'] ?? lower['1'], langs),
          this._unwrapLocalizedValue(lower['3'] ?? lower['2'], langs),
          this._unwrapLocalizedValue(lower['4'] ?? lower['3'], langs),
        ];
      }
      for (const l of langs) {
        if (l in lower) {
          const nested = this._extractOptionsFromCollection(lower[l], langs);
          if (nested.some((s) => s.length > 0)) return nested;
        }
      }
    }
    return ['', '', '', ''];
  },

  validateAndNormalize(rawRows: Record<string, any>[], preferredLang = 'en'): ImportParseResult {
    if (!rawRows.length) {
      return {
        validQuestions: [],
        errors: [{ rowNumber: 1, field: 'dataset', message: 'No question rows found.' }],
        totalRows: 0,
        duplicateCount: 0,
        rawRows: [],
      };
    }

    const langs = this._langPriority(preferredLang);
    const valid: ParsedMcqRow[] = [];
    const errors: ImportRowError[] = [];
    const normalizedRawRows: Record<string, any>[] = [];
    const seenQuestions = new Map<string, number>();
    let duplicateCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const lowerOriginal: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawRows[i])) {
        lowerOriginal[k.trim().toLowerCase()] = v;
      }
      const lowerRow = this._mergeLocalizedContainer(lowerOriginal, langs);

      const qText = this._pickLocalizedField(lowerRow, QUESTION_ALIASES, langs);
      let optA = this._pickLocalizedField(lowerRow, OPT_A_ALIASES, langs);
      let optB = this._pickLocalizedField(lowerRow, OPT_B_ALIASES, langs);
      let optC = this._pickLocalizedField(lowerRow, OPT_C_ALIASES, langs);
      let optD = this._pickLocalizedField(lowerRow, OPT_D_ALIASES, langs);

      if (!optA || !optB || !optC || !optD) {
        const optionContainerAliases = [
          ...langs.flatMap((l) => [`options_${l}`, `choices_${l}`, `opts_${l}`]),
          'options',
          'choices',
          'answers',
          'opts',
        ];
        for (const key of optionContainerAliases) {
          if (!(key in lowerRow)) continue;
          const extracted = this._extractOptionsFromCollection(lowerRow[key], langs);
          if (extracted.some((s) => s.length > 0)) {
            if (!optA) optA = extracted[0];
            if (!optB) optB = extracted[1];
            if (!optC) optC = extracted[2];
            if (!optD) optD = extracted[3];
            if (optA && optB && optC && optD) break;
          }
        }
      }

      const rawCorrect = this._pickLocalizedField(lowerRow, CORRECT_ALIASES, langs);
      const explanation = this._pickLocalizedField(lowerRow, EXPLANATION_ALIASES, langs);
      const rawKey = this._pickLocalizedField(lowerRow, KEY_ALIASES, langs);
      const qKey = rawKey || `Q${rowNum}`;

      let normalizedAnswer = this.normalizeCorrectOption(rawCorrect);
      if (!normalizedAnswer && rawCorrect) {
        const normAns = rawCorrect.trim().toLowerCase();
        if (normAns === optA.trim().toLowerCase() && optA) normalizedAnswer = 'A';
        else if (normAns === optB.trim().toLowerCase() && optB) normalizedAnswer = 'B';
        else if (normAns === optC.trim().toLowerCase() && optC) normalizedAnswer = 'C';
        else if (normAns === optD.trim().toLowerCase() && optD) normalizedAnswer = 'D';
      }

      normalizedRawRows.push({
        question_key: qKey,
        question_text: qText,
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_option: normalizedAnswer ?? rawCorrect,
        explanation,
      });

      let rowHasError = false;
      if (!qText) {
        errors.push({ rowNumber: rowNum, field: 'question_text', message: 'Question text is missing.' });
        rowHasError = true;
      }
      if (!optA || !optB || !optC || !optD) {
        errors.push({ rowNumber: rowNum, field: 'options', message: 'All 4 options (A, B, C, D) are required.' });
        rowHasError = true;
      }
      if (!normalizedAnswer) {
        errors.push({
          rowNumber: rowNum,
          field: 'correct_option',
          message: `Invalid correct_option "${rawCorrect}". Expected A, B, C, D or 1-4.`,
        });
        rowHasError = true;
      }

      if (qText) {
        const dedupeKey = qText.trim().toLowerCase().replace(/\s+/g, ' ');
        if (seenQuestions.has(dedupeKey)) {
          duplicateCount++;
          errors.push({
            rowNumber: rowNum,
            field: 'question_text',
            message: `Duplicate question found (first appeared at row ${seenQuestions.get(dedupeKey)}).`,
          });
          rowHasError = true;
        } else {
          seenQuestions.set(dedupeKey, rowNum);
        }
      }

      if (!rowHasError && normalizedAnswer) {
        valid.push({
          questionKey: qKey,
          questionText: qText,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctOption: normalizedAnswer,
          explanation,
          displayOrder: valid.length + 1,
        });
      }
    }

    return {
      validQuestions: valid,
      errors,
      totalRows: rawRows.length,
      duplicateCount,
      rawRows: normalizedRawRows,
    };
  },
};
