import { describe, expect, it } from 'vitest'
import { CsvParseError, parseCsv } from './csvParser'

describe('parseCsv', () => {
  it('parses a valid CSV into headers and rows', () => {
    const result = parseCsv('age,bmi,diagnosis\n52,27.4,1\n47,31.2,0\n')
    expect(result.headers).toEqual(['age', 'bmi', 'diagnosis'])
    expect(result.rows).toEqual([
      ['52', '27.4', '1'],
      ['47', '31.2', '0'],
    ])
  })

  it('handles quoted fields containing commas and escaped quotes', () => {
    const result = parseCsv('name,note\n"Doe, John","said ""hello"""\n')
    expect(result.headers).toEqual(['name', 'note'])
    expect(result.rows).toEqual([['Doe, John', 'said "hello"']])
  })

  it('handles CRLF line endings', () => {
    const result = parseCsv('a,b\r\n1,2\r\n3,4\r\n')
    expect(result.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('throws for a completely empty file', () => {
    expect(() => parseCsv('')).toThrow(CsvParseError)
    expect(() => parseCsv('   \n  ')).toThrow(CsvParseError)
  })

  it('throws when the header row is blank', () => {
    expect(() => parseCsv(',,\n1,2,3\n')).toThrow(CsvParseError)
  })

  it('throws for an unterminated quoted field', () => {
    expect(() => parseCsv('a,b\n"unterminated,2\n')).toThrow(CsvParseError)
  })

  it('drops trailing blank lines without producing a phantom row', () => {
    const result = parseCsv('a,b\n1,2\n\n\n')
    expect(result.rows).toEqual([['1', '2']])
  })

  it('parses a header-only CSV as zero data rows, not an error', () => {
    const result = parseCsv('a,b,c\n')
    expect(result.headers).toEqual(['a', 'b', 'c'])
    expect(result.rows).toEqual([])
  })
})
