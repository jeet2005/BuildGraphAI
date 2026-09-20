import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { conflictApi, entityApi } from '../utils/api'
import { Shield, AlertTriangle, CheckCircle, AlertCircle, Search, Filter, ChevronDown, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

export default function DataTrust() {
  const { projectId } = useAuth()
  const [trustData, setTrustData] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [trustRes, conflictsRes] = await Promise.all([
        conflictApi.getTrustScore(projectId),
        conflictApi.getConflicts(projectId)
      ])
      setTrustData(trustRes.data)
      setConflicts(conflictsRes.data)
    } catch (error) {
      console.error('Failed to load trust data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConflicts = conflicts.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (searchQuery && !c.entity_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'conflict': return 'text-red-400'
      case 'review': return 'text-amber-400'
      default: return 'text-green-400'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'conflict': return 'badge-red'
      case 'review': return 'badge-amber'
      default: return 'badge-green'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'conflict': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'review': return <AlertCircle className="w-4 h-4 text-amber-400" />
      default: return <CheckCircle className="w-4 h-4 text-green-400" />
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const overallStatus = trustData?.overall_status || 'healthy'
  const overallTrust = trustData?.overall_trust_score || 100

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Trust Engine</h1>
            <p className="text-dark-400">Detect contradictions before decisions are made from bad data</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg ${overallStatus === 'critical' ? 'bg-red-500/20 border-red-500/30' : overallStatus === 'warning' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
            <div className="flex items-center gap-2">
              {overallStatus === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
              {overallStatus === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {overallStatus === 'healthy' && <CheckCircle className="w-4 h-4 text-green-400" />}
              <span className="font-semibold capitalize">{overallStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Overall Trust Score</p>
              <p className="text-4xl font-bold text-white">{overallTrust}%</p>
            </div>
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Trust', value: overallTrust },
                    { name: 'Gap', value: 100 - overallTrust }
                  ]}
                  cx="40"
                  cy="40"
                  innerRadius={30}
                  outerRadius={38}
                  startAngle={-90}
                  endAngle={270}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <p className="text-dark-400 text-sm">Critical Conflicts</p>
          <p className="text-4xl font-bold text-red-400">{trustData?.total_conflicts || 0}</p>
        </div>
        <div className="card">
          <p className="text-dark-400 text-sm">Items Needing Review</p>
          <p className="text-4xl font-bold text-amber-400">{trustData?.total_reviews || 0}</p>
        </div>
        <div className="card">
          <p className="text-dark-400 text-sm">Entities Monitored</p>
          <p className="text-4xl font-bold text-white">{trustData?.entities?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Trust Score Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trustData?.entities?.map(e => ({
              name: e.entity_name.length > 20 ? e.entity_name.substring(0, 20) + '...' : e.entity_name,
              trust: e.trust_score,
              fullName: e.entity_name
            })) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} width={180} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    return (
                      <div className="bg-dark-900 border border-dark-600 rounded-lg p-3">
                        <p className="font-medium text-white">{item.fullName}</p>
                        <p className="text-primary-400">Trust Score: {item.trust}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="trust"
                radius={[0, 4, 4, 0]}
                barSize={20}
                fill="#3b82f6"
              >
                {trustData?.entities?.map((e, i) => (
                  <Cell key={`cell-${i}`} fill={e.trust_score < 50 ? '#ef4444' : e.trust_score < 75 ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Trust Categories</h3>
          <div className="space-y-4">
            {[
              { label: 'High Trust (≥75%)', color: '#22c55e', count: trustData?.entities?.filter(e => e.trust_score >= 75).length || 0 },
              { label: 'Medium Trust (50-74%)', color: '#f59e0b', count: trustData?.entities?.filter(e => e.trust_score >= 50 && e.trust_score < 75).length || 0 },
              { label: 'Low Trust (<50%)', color: '#ef4444', count: trustData?.entities?.filter(e => e.trust_score < 50).length || 0 }
            ].map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cat.color + '20' }}>
                  <div className="w-5 h-5 rounded" style={{ background: cat.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{cat.label}</p>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${trustData?.entities?.length > 0 ? (cat.count / trustData.entities.length * 100) : 0}%`, background: cat.color }}
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Progress Conflicts & Discrepancies
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entity..."
                className="input pl-10 w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">All Status</option>
              <option value="conflict">Conflict</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        {filteredConflicts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-dark-400 mb-2">No Conflicts Found</h3>
            <p className="text-dark-500">All progress sources are aligned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConflicts.map((conflict, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border-l-4 transition-all ${
                  conflict.status === 'conflict' ? 'border-red-500 bg-red-500/5' :
                  'border-amber-500 bg-amber-500/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(conflict.status)}
                      <h4 className="font-semibold text-white">{conflict.entity_name}</h4>
                      <span className={`badge ${getStatusBadge(conflict.status)}`}>
                        {conflict.status.toUpperCase()}
                      </span>
                      <span className="badge badge-blue">{conflict.max_difference.toFixed(0)}% diff</span>
                    </div>
                    <p className="text-dark-300 mb-2">{conflict.recommendation}</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(conflict.sources).map(([source, value]) => (
                        <span key={source} className="px-2 py-1 bg-dark-800 rounded text-xs text-dark-300">
                          {source}: {value}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="btn-secondary text-sm whitespace-nowrap">Investigate</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {trustData?.summary && (
        <div className="card border-primary-500/30 bg-primary-500/5">
          <h3 className="text-lg font-semibold text-primary-300 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI Summary
          </h3>
          <p className="text-dark-200">{trustData.summary}</p>
        </div>
      )}
    </div>
  )
}