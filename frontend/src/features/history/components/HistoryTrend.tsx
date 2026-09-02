import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisRecord } from '../types/history'
import { useState } from 'react'

type Props = {
  data: AnalysisRecord[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function HistoryTrend({ data, selectedId, onSelect }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<AnalysisRecord | null>(null)

  // We only plot COMPLETE analyses on the trend line, and reverse them so time flows left to right
  const plotData = data
    .filter((r) => r.status === 'COMPLETE')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (plotData.length < 2) {
    return (
      <div className="w-full h-32 md:h-44 flex items-center justify-center border border-line-subtle bg-surface/30 rounded-sm">
         <span className="font-mono text-xs text-muted uppercase tracking-widest">Insufficient data for trend curve</span>
      </div>
    )
  }

  const width = 800
  const height = 120
  const paddingX = 30
  const paddingY = 24
  
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2

  const maxRisk = Math.max(...plotData.map((d) => d.riskScore), 1)
  const minRisk = 0

  const getX = (index: number) => paddingX + (index / (plotData.length - 1)) * innerWidth
  const getY = (risk: number) => paddingY + innerHeight - ((risk - minRisk) / (maxRisk - minRisk)) * innerHeight

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
    <div className="w-full relative py-4">
       <div className="flex justify-between items-end mb-3">
          <h2 className="font-mono text-xs text-muted tracking-widest uppercase">Historical Risk Trajectory</h2>
          <span className="font-mono text-[10px] text-secondary tracking-widest uppercase">
            {plotData.length} Executions · Risk vs Time
          </span>
       </div>
       
       <div className="relative w-full overflow-hidden border border-line bg-surface/40 rounded-sm">
         <svg 
           viewBox={`0 0 ${width} ${height}`}
           preserveAspectRatio="none"
           className="w-full h-32 md:h-44 overflow-visible"
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
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
           />
           
           {/* Data Points and Hitboxes */}
           {plotData.map((d, i) => {
             const cx = getX(i)
             const cy = getY(d.riskScore)
             const isSelected = selectedId === d.id

             return (
               <g 
                 key={d.id} 
                 className="group cursor-pointer focus:outline-none"
                 tabIndex={0}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     onSelect?.(d.id)
                   }
                 }}
                 onClick={() => onSelect?.(d.id)}
                 onMouseEnter={() => {
                   setHoveredPoint(d)
                 }}
                 onMouseLeave={() => {
                   setHoveredPoint(null)
                 }}
               >
                 {/* Invisible larger hitbox for easier hovering */}
                 <circle
                   cx={cx}
                   cy={cy}
                   r={16}
                   fill="transparent"
                 />
                 {/* Highlight circle on selected */}
                 {isSelected && (
                   <circle
                     cx={cx}
                     cy={cy}
                     r={8}
                     fill="none"
                     stroke="var(--color-accent)"
                     strokeWidth="1.5"
                     opacity="0.6"
                   />
                 )}
                 <circle
                   cx={cx}
                   cy={cy}
                   r={isSelected ? 4.5 : 3.5}
                   fill={isSelected ? "var(--color-accent)" : "var(--color-surface)"}
                   stroke="var(--color-accent)"
                   strokeWidth="1.5"
                   className="transition-transform group-hover:scale-150"
                 />
               </g>
             )
           })}
         </svg>
       </div>

       {/* Floating Tooltip Card */}
       <AnimatePresence>
         {hoveredPoint && (
           <motion.div
             initial={{ opacity: 0, y: 4, scale: 0.98 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, scale: 0.98 }}
             transition={{ duration: 0.15 }}
             className="absolute top-2 right-2 bg-surface-raised border border-line-strong p-3.5 shadow-popover pointer-events-none z-20 rounded-sm min-w-[200px]"
           >
             <div className="flex flex-col gap-1 font-mono">
               <div className="flex justify-between items-center text-[10px] text-muted tracking-widest uppercase">
                 <span>ANALYSIS</span>
                 <span className="text-primary font-bold">{hoveredPoint.id}</span>
               </div>
               
               <div className="flex justify-between text-xs text-secondary mt-1">
                 <span>Date</span>
                 <span>{new Date(hoveredPoint.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
               </div>
               <div className="flex justify-between text-xs text-secondary">
                 <span>Engine</span>
                 <span className="text-primary">{hoveredPoint.engine}</span>
               </div>
               
               <div className="w-full border-t border-line-subtle my-1.5" />
               
               <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] text-muted uppercase tracking-widest">Risk Score</span>
                  <span className={`font-bold ${hoveredPoint.riskScore > 0.7 ? 'text-danger' : 'text-success'}`}>
                    {hoveredPoint.riskScore.toFixed(2)} ({hoveredPoint.classification})
                  </span>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}
