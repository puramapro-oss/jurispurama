import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const JUSTICE = '#1E3A5F'
const JUSTICE_DARK = '#0A1224'
const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E2C878'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const title =
    searchParams.get('title')?.slice(0, 120) ??
    "L'avocat qui ne dort jamais"
  const subtitle = searchParams.get('subtitle')?.slice(0, 160) ?? 'JurisPurama'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: `linear-gradient(135deg, ${JUSTICE_DARK} 0%, ${JUSTICE} 55%, #2A5384 100%)`,
          color: 'white',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Aurora glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}55 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${JUSTICE}AA 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${JUSTICE} 0%, ${GOLD} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
            }}
          >
            ⚖️
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              JurisPurama
            </div>
            <div
              style={{
                fontSize: '18px',
                color: GOLD_LIGHT,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}
            >
              Assistant juridique IA
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 10,
            maxWidth: '960px',
          }}
        >
          <div
            style={{
              fontSize: '78px',
              fontStyle: 'italic',
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${GOLD_LIGHT} 100%)`,
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'sans-serif',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '28px',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'sans-serif',
              display: 'flex',
            }}
          >
            jurispurama.purama.dev
          </div>
          <div
            style={{
              fontSize: '20px',
              color: GOLD,
              fontFamily: 'sans-serif',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>14 jours gratuits</span>
            <span>•</span>
            <span>Sans CB</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
