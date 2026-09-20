import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectApi } from '../utils/api'
import {
  Building2, HardHat, UserCheck, Briefcase,
  ArrowRight, Check, Loader2
} from 'lucide-react'

const roles = [
  {
    id: 'project_manager',
    name: 'Project Manager',
    title: 'Rahul Sharma',
    icon: Building2,
    color: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    hoverColor: 'hover:bg-blue-500/30 hover:border-blue-500/50',
    focus: 'Schedule • Cost • Risks • Contractors',
    description: 'Oversee project delivery, manage schedules, budgets, and coordinate across all stakeholders.',
    priorities: ['Critical path monitoring', 'Budget control', 'Risk mitigation', 'Stakeholder communication']
  },
  {
    id: 'site_engineer',
    name: 'Site Engineer',
    title: 'Priya Patel',
    icon: HardHat,
    color: 'bg-green-500/20 border-green-500/30 text-green-400',
    hoverColor: 'hover:bg-green-500/30 hover:border-green-500/50',
    focus: 'Site Issues • Materials • Activities • Unresolved Work',
    description: 'Manage daily site operations, track progress, resolve field issues, and ensure quality.',
    priorities: ['Progress verification', 'Material availability', 'Quality checks', 'Safety compliance']
  },
  {
    id: 'contractor',
    name: 'Contractor',
    title: 'Rajesh Kumar',
    icon: UserCheck,
    color: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    hoverColor: 'hover:bg-amber-500/30 hover:border-amber-500/50',
    focus: 'Assigned Tasks • Blockers • Dependencies • Deadlines',
    description: 'Execute assigned work packages, manage crew, track dependencies, and meet deadlines.',
    priorities: ['Task execution', 'Dependency resolution', 'Resource planning', 'Delivery schedules']
  },
  {
    id: 'management',
    name: 'Management',
    title: 'Vikram Singh',
    icon: Briefcase,
    color: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    hoverColor: 'hover:bg-purple-500/30 hover:border-purple-500/50',
    focus: 'Project Health • Financial Exposure • Schedule • Major Risks',
    description: 'Executive oversight of project portfolio, financial performance, and strategic decisions.',
    priorities: ['Portfolio health', 'Financial exposure', 'Strategic risks', 'GO/NO-GO decisions']
  }
]

export default function RoleSelection() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await projectApi.getAll()
      setProjects(response.data)
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]._id)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleEnter = async () => {
    if (!selectedRole || !selectedProject) return
    setEntering(true)

    const roleData = roles.find(r => r.id === selectedRole)
    login(selectedRole, selectedProject, roleData.title)

    await new Promise(resolve => setTimeout(resolve, 800))
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-900/20 via-dark-900 to-dark-950" />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-16 animate-slide-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              <span className="text-primary-400 text-sm font-medium">LIVE DEMO • ₹0 COST • LOCAL-FIRST AI</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-primary-300 to-amber-300 bg-clip-text text-transparent mb-6">
              BuildGraph AI
            </h1>
            <p className="text-xl md:text-2xl text-dark-300 max-w-3xl mx-auto leading-relaxed">
              The connected intelligence layer for construction projects.
              <br />
              <span className="text-primary-400">One project → Connected data → AI understands relationships → Different users get different intelligence.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {roles.map((role, index) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 p-6 ${role.color} ${role.hoverColor} ${selectedRole === role.id ? 'border-2 scale-102 shadow-[0_0_30px_' + role.color.replace('bg-', '').replace('/20', '') + ']' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                {selectedRole === role.id && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center animate-pulse">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${role.color.replace('text-', 'bg-').replace('border-', 'bg-')}`}>
                    <role.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{role.name}</h3>
                  <p className="text-dark-400 mb-4">{role.title}</p>
                  <div className="flex items-center gap-2 text-sm text-dark-400 mb-4">
                    <span className="px-2 py-1 bg-white/5 rounded-full">Focus:</span>
                    <span className="font-medium text-white">{role.focus}</span>
                  </div>
                  <p className="text-dark-500 text-sm mb-6">{role.description}</p>
                  <div className="space-y-2">
                    {role.priorities.map((priority, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-dark-300 group-hover:text-white transition-colors">
                        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                        <span>{priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '400ms' }}>
            <div className="card max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary-400" />
                Select Project
              </h3>
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : (
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="input mb-6"
                >
                  <option value="">Choose a project...</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{Math.round(p.value / 1e7)} Cr
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleEnter}
                disabled={!selectedRole || !selectedProject || entering}
                className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {entering ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entering BuildGraph...
                  </>
                ) : (
                  <>
                    Enter BuildGraph
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-dark-500 text-sm animate-fade-in" style={{ animationDelay: '800ms' }}>
        Hackathon Demo • Local AI (Ollama) • MongoDB • FAISS • React Flow
      </div>
    </div>
  )
}