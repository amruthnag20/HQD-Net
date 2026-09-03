/** Standard binary classification metrics computed from real prediction
 *  arrays — nothing here is a placeholder or a fabricated default. */

export type ConfusionCounts = { tp: number; fp: number; tn: number; fn: number }

export function computeConfusion(actual: number[], predicted: number[]): ConfusionCounts {
  let tp = 0
  let fp = 0
  let tn = 0
  let fn = 0
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 1 && predicted[i] === 1) tp++
    else if (actual[i] === 0 && predicted[i] === 1) fp++
    else if (actual[i] === 0 && predicted[i] === 0) tn++
    else fn++
  }
  return { tp, fp, tn, fn }
}

export function computeAccuracy(c: ConfusionCounts): number {
  const total = c.tp + c.fp + c.tn + c.fn
  return total === 0 ? 0 : (c.tp + c.tn) / total
}

export function computePrecision(c: ConfusionCounts): number {
  const denom = c.tp + c.fp
  return denom === 0 ? 0 : c.tp / denom
}

export function computeRecall(c: ConfusionCounts): number {
  const denom = c.tp + c.fn
  return denom === 0 ? 0 : c.tp / denom
}

export function computeF1(precision: number, recall: number): number {
  const denom = precision + recall
  return denom === 0 ? 0 : (2 * precision * recall) / denom
}

/** Area under the ROC curve via the Mann-Whitney U rank-sum identity: the
 *  probability a random positive scores higher than a random negative
 *  (ties count as half a win). Returns null when only one class is present
 *  — AUC is undefined without both. */
export function computeRocAuc(actualBinary: number[], predictedProbabilities: number[]): number | null {
  const positives: number[] = []
  const negatives: number[] = []
  for (let i = 0; i < actualBinary.length; i++) {
    if (actualBinary[i] === 1) positives.push(predictedProbabilities[i])
    else negatives.push(predictedProbabilities[i])
  }
  if (positives.length === 0 || negatives.length === 0) return null

  let wins = 0
  for (const p of positives) {
    for (const n of negatives) {
      if (p > n) wins += 1
      else if (p === n) wins += 0.5
    }
  }
  return wins / (positives.length * negatives.length)
}
