/** A small synthetic clinical CSV used by the "Load sample dataset" action —
 *  deliberately varied (a numeric range, a categorical column, an identifier
 *  column, a mostly-empty column, and a binary target) so the ingestion
 *  demo actually exercises column detection rather than a trivial file. */

const HEADER = 'patient_id,age,bmi,glucose,blood_pressure,smoker,notes,diagnosis'

const ROWS = [
  ['PAT-1001', 52, 27.4, 118, 132, 'yes', '', 1],
  ['PAT-1002', 47, 31.2, 142, 145, 'no', '', 1],
  ['PAT-1003', 61, 24.8, 99, 121, 'no', '', 0],
  ['PAT-1004', 39, 22.1, 88, 110, 'no', '', 0],
  ['PAT-1005', 58, 29.6, 151, 149, 'yes', '', 1],
  ['PAT-1006', 44, 26.3, 104, 118, '', '', 0],
  ['PAT-1007', 66, 33.7, 163, 158, 'yes', '', 1],
  ['PAT-1008', 35, 21.4, '', 108, 'no', '', 0],
  ['PAT-1009', 50, 28.9, 132, 138, 'no', '', 1],
  ['PAT-1010', 42, 23.5, 95, 115, 'no', '', 0],
]

export const SAMPLE_DATASET_FILENAME = 'sample_clinical_dataset.csv'

export const SAMPLE_DATASET_CSV = [HEADER, ...ROWS.map((row) => row.join(','))].join('\n')
