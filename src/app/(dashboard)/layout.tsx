import Sidebar from '@/components/layout/Sidebar'
import BottomTabBar from '@/components/layout/BottomTabBar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-24 lg:pb-0">{children}</main>
      <BottomTabBar />
    </div>
  )
}
