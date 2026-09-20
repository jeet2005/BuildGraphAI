import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, HardHat, UserCheck, Briefcase, GitBranch, SlidersHorizontal, ShieldAlert, BookOpen, LogOut, Menu, X, Bot, Home } from 'lucide-react'
import AIChat from '../components/AIChat'

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/graph', label: 'Project Graph', icon: GitBranch },
  { path: '/simulator', label: 'Impact Simulator', icon: SlidersHorizontal },
  { path: '/trust', label: 'Data Trust', icon: ShieldAlert },
  { path: '/memory', label: 'Project Memory', icon: BookOpen }
]

const roleLabels = {
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  contractor: 'Contractor',
  management: 'Management'
}

const roleIcons = {
  project_manager: Building2,
  site_engineer: HardHat,
  contractor: UserCheck,
  management: Briefcase
}

export default function Layout() {
  const { role, userName, logout, projectId } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/role')
  }

  const RoleIcon = roleIcons[role] || Building2

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900/95 backdrop-blur-sm border-r border-dark-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BuildGraph AI</h1>
                <p className="text-xs text-dark-400">Connected Intelligence</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-lg shadow-primary-500/10'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-white hover:border-dark-600'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="p-4 border-t border-dark-700">
            <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 rounded-xl mb-3">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <RoleIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-dark-400 capitalize">{roleLabels[role] || role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary w-full justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-dark-800 text-dark-300"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-white hidden sm:block">
                {navItems.find(n => n.path === window.location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(true)}
                className="btn-primary hidden sm:flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                AI Assistant
              </button>
              <button
                onClick={() => setChatOpen(true)}
                className="btn-primary sm:hidden p-2"
              >
                <Bot className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>

      <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} role={role} />
    </div>
  )
}