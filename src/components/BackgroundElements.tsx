import { motion } from 'framer-motion'
import {
  CoatHanger, Pants, TShirt, Dress, Crown, Diamond,
  Sparkle, StarFour, Medal, Scissors, Needle, Ruler,
} from '@phosphor-icons/react'

const GOLD = '#C9A84C'
const GOLD_DEEP = '#A8823A'

// Fondo blanco con patrón de puntos dorados + resplandores
function BackgroundGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base blanca */}
      <div className="absolute inset-0 bg-white" />

      {/* Parches / resplandores dorados difusos repartidos */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: 'rgba(212,175,55,0.16)', filter: 'blur(120px)' }}
      />
      <div
        className="absolute top-[-6%] left-[-4%] w-[480px] h-[480px] rounded-full"
        style={{ background: 'rgba(201,168,76,0.22)', filter: 'blur(110px)' }}
      />
      <div
        className="absolute top-[5%] right-[-5%] w-[420px] h-[420px] rounded-full"
        style={{ background: 'rgba(168,130,58,0.18)', filter: 'blur(100px)' }}
      />
      <div
        className="absolute bottom-[-8%] left-[15%] w-[520px] h-[520px] rounded-full"
        style={{ background: 'rgba(212,175,55,0.20)', filter: 'blur(120px)' }}
      />
      <div
        className="absolute bottom-[2%] right-[8%] w-[440px] h-[440px] rounded-full"
        style={{ background: 'rgba(201,168,76,0.18)', filter: 'blur(110px)' }}
      />
      <div
        className="absolute top-[40%] left-[2%] w-[360px] h-[360px] rounded-full"
        style={{ background: 'rgba(168,130,58,0.15)', filter: 'blur(90px)' }}
      />

      {/* Patrón de puntos dorados */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.5,
          backgroundImage: 'radial-gradient(rgba(201,168,76,0.55) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  )
}

// Iconos flotantes dorados (trajes / sastrería)
function FloatingIcons() {
  const icons = [
    { Icon: CoatHanger, x: '10%', y: '20%', size: 30, delay: 0 },
    { Icon: Pants, x: '85%', y: '15%', size: 32, delay: 1 },
    { Icon: TShirt, x: '15%', y: '78%', size: 30, delay: 2 },
    { Icon: Crown, x: '80%', y: '74%', size: 28, delay: 3 },
    { Icon: Sparkle, x: '50%', y: '10%', size: 22, delay: 4 },
    { Icon: Scissors, x: '5%', y: '50%', size: 30, delay: 1.5 },
    { Icon: Diamond, x: '92%', y: '45%', size: 24, delay: 2.5 },
    { Icon: Needle, x: '25%', y: '14%', size: 24, delay: 0.5 },
    { Icon: StarFour, x: '70%', y: '85%', size: 26, delay: 3.5 },
    { Icon: Ruler, x: '35%', y: '90%', size: 28, delay: 1.2 },
    { Icon: Medal, x: '60%', y: '6%', size: 26, delay: 2.8 },
    { Icon: Dress, x: '12%', y: '38%', size: 28, delay: 0.8 },
    { Icon: CoatHanger, x: '90%', y: '88%', size: 30, delay: 4 },
    { Icon: Sparkle, x: '45%', y: '94%', size: 22, delay: 1.8 },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {icons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{
            left: item.x,
            top: item.y,
            color: index % 2 === 0 ? GOLD : GOLD_DEEP,
            opacity: 0.22,
            filter: 'blur(0.5px)',
          }}
          animate={{
            y: [0, -25, 0],
            rotate: [0, 12, -12, 0],
            scale: [1, 1.1, 1],
            opacity: [0.18, 0.42, 0.18],
          }}
          transition={{
            duration: 6 + (index % 4),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: item.delay,
          }}
        >
          <item.Icon size={item.size} weight="light" />
        </motion.div>
      ))}
    </div>
  )
}

export default function BackgroundElements() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <BackgroundGrid />
      <FloatingIcons />
    </div>
  )
}
