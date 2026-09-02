export type MockNotification = {
  id: string
  title: string
  detail: string
  timestamp: string
  read: boolean
}

export const mockNotifications: MockNotification[] = [
  {
    id: 'n1',
    title: 'Analysis completed',
    detail: 'HQD-1042',
    timestamp: '2 min ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Quantum backend ready',
    detail: 'Local Simulator',
    timestamp: '18 min ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'System maintenance scheduled',
    detail: 'Tomorrow, 02:00–02:30',
    timestamp: '1 hr ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'Benchmark report ready',
    detail: 'Classical baseline comparison',
    timestamp: 'Yesterday',
    read: true,
  },
]
