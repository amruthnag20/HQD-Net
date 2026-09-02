export const landingCopy = {
  nav: {
    wordmark: 'HQD-Net',
    status: 'System online',
    statusMono: 'SYS / ONLINE',
    signIn: 'Sign in',
    signUp: 'Sign up',
  },
  hero: {
    coordinate: 'HQD / 01',
    eyebrowLine1: 'Hybrid Quantum',
    eyebrowLine2: 'Diagnostic Network',
    heading: 'HQD-Net',
    subhead:
      'Classical preprocessing. Quantum representation. Explainable clinical output with every step kept visible.',
    primaryCta: 'Begin Analysis',
    secondaryCta: 'Sign in',
    tagline: 'Classical → Quantum → Clinical',
  },
  architecture: {
    coordinate: '02 / PIPELINE',
    eyebrow: 'How it runs',
    headline: 'The Pipeline',
    stages: [
      {
        id: 'classical-in',
        number: '01',
        label: 'Classical',
        sublabel: 'Preprocessing',
        body: 'Patient data is cleaned, normalized, and compressed — extracting only the features a quantum circuit can meaningfully encode.',
        technical: '30+ features → 4–8 signals',
      },
      {
        id: 'quantum',
        number: '02',
        label: 'Quantum',
        sublabel: 'Representation',
        body: 'Those features are angle-embedded onto a 4–8 qubit circuit and evaluated on quantum hardware. A specific, measurable computation — not a metaphor.',
        technical: '4–8 qubits / angle embedding',
      },
      {
        id: 'clinical',
        number: '03',
        label: 'Clinical',
        sublabel: 'Translation',
        body: "The circuit's output decodes into a diagnostic read a clinician can act on, with contributing factors kept fully traceable.",
        technical: 'Explainable output',
      },
    ],
  },
  evidence: {
    coordinate: '03 / EVIDENCE',
    headlineLine1: 'Evidence',
    headlineLine2: 'Over Hype',
    subhead:
      'Quantum is treated here as one measurable component in a diagnostic pipeline. Every claim is testable.',
    points: [
      {
        id: 'baselines',
        label: 'Classical baselines',
        body: 'Every quantum result is compared against a classical model trained on the same data — quantum advantage must be demonstrated, not assumed.',
      },
      {
        id: 'explainability',
        label: 'Explainability',
        body: 'Each output keeps a traceable path back to the input features that drove it. No black-box diagnosis.',
      },
      {
        id: 'resource',
        label: 'Resource-awareness',
        body: 'Circuit width, depth, and execution cost are reported alongside results. The cost of quantum computation is never hidden.',
      },
    ],
  },
  finalCta: {
    coordinate: '04 / ACCESS',
    headline: 'Enter HQD-Net',
    subhead: 'Start with your own data. Classical baselines computed automatically.',
    cta: 'Begin Analysis',
    secondary: 'Sign in',
  },
  footer: {
    wordmark: 'HQD-Net',
    descriptor: 'Hybrid Quantum Diagnostic Network',
    copyright: '© 2026 HQD-Net.',
    build: 'Phase 2 / Local Engine',
  },
} as const
