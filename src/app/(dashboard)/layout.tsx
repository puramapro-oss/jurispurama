import Sidebar from '@/components/layout/Sidebar'
import BottomTabBar from '@/components/layout/BottomTabBar'
import NotificationBell from '@/components/layout/NotificationBell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-24 lg:pb-0">
        <div className="sticky top-0 z-30 flex justify-end border-b border-[var(--border)]/60 bg-white/70 px-4 py-2 backdrop-blur-xl lg:px-6">
          <NotificationBell />
        </div>
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
