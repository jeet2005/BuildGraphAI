import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { projectApi, entityApi, impactApi, conflictApi, aiApi } from '../utils/api'
import {
  AlertTriangle, TrendingUp, TrendingDown, Clock,
  Building2, HardHat, UserCheck, Briefcase,
  ArrowUpRight, ArrowDownRight, Minus, Plus,
  MessageSquare, Zap, Shield, Brain
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const roleDashboards = {
  project_manager: {
    title: 'PROJECT MANAGER VIEW',
    greeting: 'Good Morning, Rahul',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    priorities: [
      { id: 'steel', label: 'Steel Delivery', status: 'critical', detail: '5 days delayed — ST-104 Structural Steel', impact: 'Affects 4 downstream activities', icon: AlertTriangle },
      { id: 'floor4', label: 'Floor 4 Progress', status: 'warning', detail: 'Conflict: Schedule 35% vs Site 20% vs Contractor 45%', impact: 'Data trust compromised', icon: Shield },
      { id: 'electrical', label: 'Electrical Work', status: 'warning', detail: 'Dependency blocked by structural delay', impact: 'Start date at risk', icon: Zap }
    ],
    aiRecommendation: 'Resolve steel procurement first. It currently affects 4 downstream activities across all 3 buildings. Consider expediting alternate supplier or resequencing Floor 4 activities to start electrical rough-in where safe.',
    metrics: [
      { label: 'Overall Progress', value: '42%', change: -3, trend: 'down' },
      { label: 'Schedule Variance', value: '+8 days', change: 8, trend: 'down' },
      { label: 'Budget Utilization', value: '78%', change: -2, trend: 'up' },
      { label: 'Data Trust Score', value: '67%', change: -15, trend: 'down' }
    ]
  },
  site_engineer: {
    title: 'SITE ENGINEER VIEW',
    greeting: 'Today\'s Priorities, Priya',
    icon: HardHat,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    priorities: [
      { id: 'verify4', label: 'Verify Floor 4 Progress', status: 'critical', detail: 'Three sources disagree — needs physical verification', impact: 'Billing & scheduling decisions blocked', icon: Shield },
      { id: 'steel', label: 'Steel Delivery Coordination', status: 'critical', detail: 'ST-104 arriving 5 days late — coordinate crane schedule', impact: 'Structural crew idle time', icon: AlertTriangle },
      { id: 'concrete', label: 'Concrete Consumption +8%', status: 'warning', detail: 'Floors 1-3 consuming above plan — investigate waste', impact: 'Potential cost overrun ₹12L', icon: TrendingUp }
    ],
    aiRecommendation: 'Priority 1: Physically verify Floor 4 structural work completion today. Priority 2: Confirm revised steel delivery date with supplier and adjust crane schedule. Priority 3: Audit concrete pour records for Floors 1-3.',
    metrics: [
      { label: 'Tasks In Progress', value: '12', change: 2, trend: 'up' },
      { label: 'Open Site Issues', value: '5', change: 1, trend: 'down' },
      { label: 'Materials On Site', value: '18/25', change: 0, trend: 'neutral' },
      { label: 'Safety Incidents', value: '0', change: 0, trend: 'neutral' }
    ],
    recentReports: [
      { id: 'r24', title: 'Site Report #24', date: 'Sep 19', summary: 'Floor 4 structural at 30%, steel awaiting', status: 'critical' },
      { id: 'r23', title: 'Site Report #23', date: 'Sep 18', summary: 'Concrete pour Floors 2-3 completed', status: 'normal' },
      { id: 'r22', title: 'Site Report #22', date: 'Sep 17', summary: 'Electrical conduit installation started Floor 3', status: 'normal' }
    ]
  },
  contractor: {
    title: 'CONTRACTOR VIEW',
    greeting: 'Your Activities, Rajesh',
    icon: UserCheck,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    priorities: [
      { id: 'structural', label: 'Floor 4 Structural Work', status: 'critical', detail: 'Blocked by steel delivery — ST-104 delayed 5 days', impact: 'Crew idle, deadline at risk', icon: AlertTriangle },
      { id: 'electrical', label: 'Electrical Installation', status: 'warning', detail: 'Start date at risk — dependency on structural', impact: 'Cannot begin until structural 60%', icon: Zap },
      { id: 'plumbing', label: 'Plumbing Rough-in', status: 'good', detail: 'On schedule — Floor 3 at 65%', impact: 'Proceeding as planned', icon: TrendingUp }
    ],
    aiRecommendation: 'Your structural work on Floor 4 is blocked. Coordinate with site engineer for revised steel delivery. Prepare crew for electrical rough-in overlap once structural reaches 60%. Plumbing on track — maintain current pace.',
    metrics: [
      { label: 'Assigned Tasks', value: '8', change: 0, trend: 'neutral' },
      { label: 'Blocked Tasks', value: '2', change: 1, trend: 'down' },
      { label: 'On Schedule', value: '5', change: 0, trend: 'neutral' },
      { label: 'Completed This Week', value: '3', change: 1, trend: 'up' }
    ],
    activities: [
      { id: 'a1', name: 'Building A - Floor 4 Structural', progress: 30, status: 'blocked', delay: 5 },
      { id: 'a2', name: 'Building A - Floor 5 Structural', progress: 10, status: 'at_risk', delay: 0 },
      { id: 'a3', name: 'Building B - Floor 4 Structural', progress: 25, status: 'blocked', delay: 5 },
      { id: 'a4', name: 'Building B - Floor 5 Structural', progress: 5, status: 'at_risk', delay: 0 },
      { id: 'a5', name: 'Building C - Floor 4 Structural', progress: 35, status: 'blocked', delay: 5 }
    ]
  },
  management: {
    title: 'EXECUTIVE VIEW',
    greeting: 'Project Health Overview, Vikram',
    icon: Briefcase,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    priorities: [
      { id: 'health', label: 'Project Health', status: 'warning', detail: '72% — Below target of 85%', impact: 'Schedule +8 days, Budget 78%', icon: TrendingDown },
      { id: 'steel', label: 'Steel Delivery Risk', status: 'critical', detail: 'ST-104 delayed 5 days — cross-building impact', impact: '₹2.1 Cr cost exposure, +8 days', icon: AlertTriangle },
      { id: 'trust', label: 'Data Trust Issue', status: 'warning', detail: 'Floor 4 progress sources disagree 15%+', impact: 'Decisions on hold pending verification', icon: Shield }
    ],
    aiRecommendation: 'Top risk: Steel delivery delay cascading across all 3 buildings. Financial exposure ₹2.1 Cr. Immediate action: Authorize alternate supplier procurement. Data trust issue on Floor 4 requires independent verification before next board update.',
    metrics: [
      { label: 'Project Health', value: '72%', change: -8, trend: 'down' },
      { label: 'Schedule Variance', value: '+8 days', change: 8, trend: 'down' },
      { label: 'Budget Utilization', value: '78%', change: -5, trend: 'up' },
      { label: 'Data Trust Score', value: '67%', change: -15, trend: 'down' }
    ],
    topRisk: {
      title: 'Steel Delivery Delay',
      impact: '₹2.1 Cr cost exposure • +8 days completion',
      severity: 'HIGH'
    }
  }
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

export default function Dashboard() {
  const { role, projectId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dashboard = roleDashboards[role] || roleDashboards.project_manager
    setData(dashboard)
    setLoading(false)
  }, [role])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const Icon = data.icon

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.bgColor}`}>
            <Icon className={`w-7 h-7 ${data.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{data.greeting}</h1>
            <p className="text-dark-400">{data.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-lg ${data.bgColor} text-sm font-medium ${data.color}`}>
            <Brain className="w-4 h-4 inline mr-1" /> AI Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.metrics.map((metric, i) => (
          <div key={i} className="card hover:border-primary-500/30">
            <p className="text-dark-400 text-sm mb-1">{metric.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{metric.value}</span>
              <div className={`flex items-center gap-1 text-sm ${metric.trend === 'up' ? 'text-green-400' : metric.trend === 'down' ? 'text-red-400' : 'text-dark-400'}`}>
                {metric.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                {metric.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                {metric.trend === 'neutral' && <Minus className="w-4 h-4" />}
                <span>{metric.change >= 0 ? '+' : ''}{metric.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Requires Your Attention
              </h3>
              <span className="badge badge-red">{data.priorities.length} Items</span>
            </div>
            <div className="space-y-4">
              {data.priorities.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border-l-4 transition-all ${
                    item.status === 'critical' ? 'border-red-500 bg-red-500/5' :
                    item.status === 'warning' ? 'border-amber-500 bg-amber-500/5' :
                    'border-green-500 bg-green-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <item.icon className={`w-5 h-5 ${item.status === 'critical' ? 'text-red-400' : item.status === 'warning' ? 'text-amber-400' : 'text-green-400'}`} />
                        <h4 className="font-semibold text-white">{item.label}</h4>
                        <span className={`badge ${item.status === 'critical' ? 'badge-red' : item.status === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                          {item.status === 'critical' ? 'CRITICAL' : item.status === 'warning' ? 'REVIEW' : 'ON TRACK'}
                        </span>
                      </div>
                      <p className="text-dark-300 mb-1">{item.detail}</p>
                      <p className="text-dark-500 text-sm">{item.impact}</p>
                    </div>
                    <button className="btn-secondary text-sm whitespace-nowrap">Investigate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-400" />
                AI Recommendation
              </h3>
              <span className="badge badge-blue">AI Generated</span>
            </div>
            <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
              <p className="text-dark-200 leading-relaxed">{data.aiRecommendation}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {data.recentReports && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                Recent Site Reports
              </h3>
              <div className="space-y-3">
                {data.recentReports.map((report, i) => (
                  <div key={report.id} className="p-3 rounded-lg bg-dark-800/50 border border-dark-700 hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{report.title}</span>
                      <span className={`badge ${report.status === 'critical' ? 'badge-red' : 'badge-green'}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-dark-400 text-sm">{report.summary}</p>
                    <p className="text-dark-500 text-xs mt-1">{report.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.activities && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                Your Activities
              </h3>
              <div className="space-y-3">
                {data.activities.map((act, i) => (
                  <div key={act.id} className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white text-sm">{act.name}</span>
                      <span className={`badge ${act.status === 'blocked' ? 'badge-red' : act.status === 'at_risk' ? 'badge-amber' : 'badge-green'}`}>
                        {act.status === 'blocked' ? 'BLOCKED' : act.status === 'at_risk' ? 'AT RISK' : 'ON TRACK'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            act.status === 'blocked' ? 'bg-red-500' :
                            act.status === 'at_risk' ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${act.progress}%` }}
                        />
                      </div>
                      <span className="text-dark-400 text-sm">{act.progress}%</span>
                      {act.delay > 0 && (
                        <span className="badge badge-red">{act.delay}d delay</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.topRisk && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-red-300">TOP RISK</h3>
                <span className="badge badge-red">{data.topRisk.severity}</span>
              </div>
              <p className="text-white font-medium mb-1">{data.topRisk.title}</p>
              <p className="text-dark-300">{data.topRisk.impact}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}