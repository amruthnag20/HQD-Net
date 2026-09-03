/** Minimal, dependency-free CSV parser (RFC4180-ish: quoted fields, "" escapes,
 *  commas/newlines inside quotes, CRLF or LF). Deliberately not a full spec
 *  implementation — biomedical export CSVs are well-formed in practice, and
 *  pulling in a parsing library for this is more than Phase 1 needs. */

export class CsvParseError extends Error {}

export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

/** Strips a UTF-8 BOM if present — common in CSVs exported from Excel. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function parseRecords(text: string): string[][] {
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  const src = stripBom(text)

  for (let i = 0; i < src.length; i++) {
    const char = src[i]

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      record.push(field)
      field = ''
    } else if (char === '\r') {
      // Handled by the following \n (or a lone \r, treated as a line end).
      if (src[i + 1] !== '\n') {
        record.push(field)
        field = ''
        records.push(record)
        record = []
      }
    } else if (char === '\n') {
      record.push(field)
      field = ''
      records.push(record)
      record = []
    } else {
      field += char
    }
  }

  // Flush a trailing field/record that wasn't newline-terminated.
  if (field.length > 0 || record.length > 0) {
    record.push(field)
    records.push(record)
  }

  if (inQuotes) {
    throw new CsvParseError('The CSV has an unterminated quoted field.')
  }

  // Drop fully-blank trailing lines (a common trailing-newline artifact).
  while (records.length > 0 && records[records.length - 1].every((cell) => cell === '')) {
    records.pop()
  }

  return records
}

/** Parses raw CSV text into a header row + data rows. Throws CsvParseError
 *  for structurally unusable input — the caller is expected to catch this
 *  and present a human-readable error rather than a stack trace. */
export function parseCsv(text: string): ParsedCsv {
  if (text.trim().length === 0) {
    throw new CsvParseError('The file is empty.')
  }

  const records = parseRecords(text)
  if (records.length === 0) {
    throw new CsvParseError('No rows could be read from this file.')
  }

  const [headerRow, ...dataRows] = records
  const headers = headerRow.map((h) => h.trim())

  if (headers.length === 0 || headers.every((h) => h === '')) {
    throw new CsvParseError('No column headers were found in the first row.')
  }

  return { headers, rows: dataRows }
}
