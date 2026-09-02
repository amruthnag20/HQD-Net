import { motion } from 'framer-motion'
import type { AnalysisRecord } from '../types/history'
import { useState } from 'react'

type Props = {
  data: AnalysisRecord[]
}

export function HistoryTrend({ data }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<AnalysisRecord | null>(null)

  // We only want to plot COMPLETE analyses on the trend line, and reverse them so time flows left to right
  const plotData = data
    .filter((r) => r.status === 'COMPLETE')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (plotData.length < 2) {
    return (
      <div className="w-full h-32 md:h-48 flex items-center justify-center border border-line-subtle bg-surface-subtle">
         <span className="font-mono text-xs text-muted uppercase tracking-widest">Insufficient data for trend</span>
      </div>
    )
  }

  // Simple SVG drawing math
  const width = 800
  const height = 120
  const paddingX = 20
  const paddingY = 20
  
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2

  const maxRisk = Math.max(...plotData.map((d) => d.riskScore), 1)
  const minRisk = 0

  const getX = (index: number) => paddingX + (index / (plotData.length - 1)) * innerWidth
  const getY = (risk: number) => paddingY + innerHeight - ((risk - minRisk) / (maxRisk - minRisk)) * innerHeight

  // D3-style bezier curve generator (simplified) for a smooth line
  const createPath = () => {
    if (plotData.length === 0) return ''
    let d = `M ${getX(0)} ${getY(plotData[0].riskScore)}`
    for (let i = 0; i < plotData.length - 1; i++) {
      const x0 = getX(i)
      const y0 = getY(plotData[i].riskScore)
      const x1 = getX(i + 1)
      const y1 = getY(plotData[i + 1].riskScore)
      const cx0 = x0 + (x1 - x0) / 2
      const cy0 = y0
      const cx1 = x0 + (x1 - x0) / 2
      const cy1 = y1
      d += ` C ${cx0} ${cy0}, ${cx1} ${cy1}, ${x1} ${y1}`
    }
    return d
  }

  return (
    <div className="w-full relative py-6">
       <div className="flex justify-between items-end mb-4">
          <h2 className="font-mono text-xs text-muted tracking-widest uppercase">Historical Trend</h2>
          <span className="font-mono text-[10px] text-secondary tracking-widest uppercase">Risk Score over Time</span>
       </div>
       
       <div className="relative w-full overflow-hidden border border-line-subtle bg-surface/50 rounded-sm">
         <svg 
           viewBox={`0 0 ${width} ${height}`}
           preserveAspectRatio="none"
           className="w-full h-32 md:h-48 overflow-visible"
         >
           {/* Grid lines */}
           <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="var(--color-line-subtle)" strokeDasharray="4 4" />
           <line x1="0" y1={paddingY + innerHeight/2} x2={width} y2={paddingY + innerHeight/2} stroke="var(--color-line-subtle)" strokeDasharray="4 4" />
           <line x1="0" y1={paddingY + innerHeight} x2={width} y2={paddingY + innerHeight} stroke="var(--color-line-subtle)" strokeDasharray="4 4" />

           {/* Trend Line */}
           <motion.path
              d={createPath()}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
           />
           
           {/* Data Points and Hitboxes */}
           {plotData.map((d, i) => (
             <g key={d.id} className="group">
               {/* Invisible larger hitbox for easier hovering */}
               <circle
                 cx={getX(i)}
                 cy={getY(d.riskScore)}
                 r={15}
                 fill="transparent"
                 onMouseEnter={() => setHoveredPoint(d)}
                 onMouseLeave={() => setHoveredPoint(null)}
                 className="cursor-pointer"
               />
               <circle
                 cx={getX(i)}
                 cy={getY(d.riskScore)}
                 r={3}
                 fill="var(--color-surface)"
                 stroke="var(--color-accent)"
                 strokeWidth="1.5"
                 className="pointer-events-none transition-transform group-hover:scale-150"
               />
             </g>
           ))}
         </svg>
       </div>

       {/* Tooltip */}
       {hoveredPoint && (
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated border border-line p-3 shadow-xl pointer-events-none z-10"
         >
           <div className="flex flex-col gap-1">
             <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Analysis</span>
             <span className="font-mono text-sm text-primary">{hoveredPoint.id}</span>
             
             <div className="flex justify-between gap-4 mt-2">
               <span className="font-sans text-xs text-secondary">{new Date(hoveredPoint.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
               <span className="font-mono text-xs text-primary">{hoveredPoint.engine}</span>
             </div>
             
             <div className="w-full border-t border-line-subtle my-2" />
             
             <div className="flex justify-between items-center gap-4">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Risk</span>
                <span className={`font-mono text-xs ${hoveredPoint.riskScore > 0.7 ? 'text-danger' : 'text-primary'}`}>
                  {hoveredPoint.riskScore.toFixed(2)}
                </span>
             </div>
           </div>
         </motion.div>
       )}
    </div>
  )
}
