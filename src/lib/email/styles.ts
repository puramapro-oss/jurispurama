export const JUSTICE = '#1E3A5F'
export const GOLD = '#C9A84C'
export const BG = '#F6F4EE'
export const TEXT = '#2C3E50'
export const MUTED = '#64748B'

export const main = {
  backgroundColor: BG,
  fontFamily:
    '"Helvetica Neue", Helvetica, Arial, "Segoe UI", Roboto, sans-serif',
  padding: '24px 0',
}

export const container = {
  backgroundColor: '#FFFFFF',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid rgba(30,58,95,0.08)',
  boxShadow: '0 10px 30px rgba(30,58,95,0.08)',
}

export const headerBar = {
  background: `linear-gradient(135deg, ${JUSTICE} 0%, #274d78 100%)`,
  padding: '24px 32px',
  color: '#FFFFFF',
}

export const brandTitle = {
  color: '#FFFFFF',
  fontSize: '22px',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '0.5px',
  fontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
}

export const goldLine = {
  height: '3px',
  width: '60px',
  backgroundColor: GOLD,
  marginTop: '10px',
  border: 0,
}

export const body = {
  padding: '28px 32px',
  color: TEXT,
  fontSize: '15px',
  lineHeight: '1.65',
}

export const h1 = {
  color: JUSTICE,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px',
}

export const p = {
  color: TEXT,
  margin: '0 0 14px',
  fontSize: '15px',
  lineHeight: '1.65',
}

export const footer = {
  padding: '20px 32px',
  backgroundColor: '#F8FAFC',
  borderTop: '1px solid rgba(30,58,95,0.06)',
  color: MUTED,
  fontSize: '11px',
  lineHeight: '1.5',
}
