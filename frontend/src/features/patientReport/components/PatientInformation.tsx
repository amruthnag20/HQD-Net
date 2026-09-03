import { usePatientReport } from '../hooks/usePatientReport'

/**
 * Patient / sample information. Displays only data actually available in the
 * dataset/context — no invented demographics.
 */
export function PatientInformation() {
  const { report } = usePatientReport()
  const p = report.patientInfo

  const rows: { label: string; value: string }[] = [
    { label: 'Patient / Sample ID', value: p.patientId },
    { label: 'Dataset', value: p.datasetName },
  ]
  if (p.age) rows.push({ label: 'Age', value: p.age })
  if (p.sex) rows.push({ label: 'Sex', value: p.sex })
  for (const d of p.demographics) rows.push(d)

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 border-b border-line-subtle py-1.5">
          <dt className="text-sm text-muted">{r.label}</dt>
          <dd className="text-right text-sm font-medium text-primary">{r.value}</dd>
        </div>
      ))}
      {p.age == null && p.sex == null && p.demographics.length === 0 && (
        <p className="text-xs text-muted sm:col-span-2">
          No additional demographic fields are available in this dataset.
        </p>
      )}
    </dl>
  )
}
