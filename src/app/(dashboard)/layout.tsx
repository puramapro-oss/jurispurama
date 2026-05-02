import Sidebar from '@/components/layout/Sidebar'
import BottomTabBar from '@/components/layout/BottomTabBar'
import MobileTopBar from '@/components/layout/MobileTopBar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh-safe bg-parchment">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <MobileTopBar />
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
