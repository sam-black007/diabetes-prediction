'use client'

import { motion, useSpring, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { scoreBand } from '@/lib/risk'

export function HealthScoreGauge({ score }: { score: number }) {
  const band = scoreBand(score)
  const reduce = useReducedMotion()

  // Animate gauge value from 0 → score using motion spring
  const gaugeValue = useSpring(score, { stiffness: 200, damping: 15 })

  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    if (reduce) {
      setDisplayScore(score)
      return undefined
    }
    const unsub = gaugeValue.on('change', (v) => setDisplayScore(Math.round(v as number)))
    return () => unsub()
  }, [gaugeValue, score, reduce])

  const glow = score >= 70 ? 'drop-shadow-[0_0_20px_rgba(239,68,64,0.4)]' : ''

  return (
    <motion.div
      className={`relative flex h-48 w-48 items-center justify-center ${glow}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <RadialBarChart
        width={192}
        height={192}
        cx={96}
        cy={96}
        innerRadius={62}
        outerRadius={88}
        barSize={16}
        data={[{ name: 'score', value: displayScore, fill: band.color }]}
        startAngle={210}
        endAngle={-30}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={8}
          background={{ fill: 'hsl(var(--muted))' }}
          angleAxisId={0}
        />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color: band.color }}>
          {Math.round(displayScore)}
        </span>
        <span className="text-xs text-muted-foreground">{band.label}</span>
      </div>
    </motion.div>
  );
}
