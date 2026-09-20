import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { entityApi, impactApi } from '../utils/api'
import { X, AlertTriangle, TrendingUp, User, Package, Building2, Loader2 } from 'lucide-react'

export default function NodePanel({ node, onClose }) {
  const { projectId } = useAuth()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [impact, setImpact] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [delayInput, setDelayInput] = useState(5)

  useEffect(() => {
    if (node) {
      fetchDetails()
    }
  }, [node])

  const fetchDetails = async () => {
    if (!node) return
    setLoading(true)
    try {
      let detail = null
      if (node.data.type === 'task') {
        const res = await entityApi.getTask(projectId, node.id)
        detail = res.data
      } else if (node.data.type === 'material') {
        const res = await entityApi.getMaterial(projectId, node.id)
        detail = res.data
      } else if (node.data.type === 'contractor') {
        const res = await entityApi.getContractor(projectId, node.id)
        detail = res.data
      }
      setDetails(detail)
    } catch (error) {
      console.error('Failed to fetch details:', error)
    } finally {
      setLoading(false)
    }
  }

  const runSimulation = async () => {
    if (!node) return
    setSimulating(true)
    try {
      const res = await impactApi.analyze(projectId, {
        entity_id: node.id,
        entity_type: node.data.type === 'task' ? 'task' : 'material',
        additional_delay: delayInput
      })
      setImpact(res.data)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setSimulating(false)
    }
  }

  if (!node) return null

  const typeIcons = {
    project: Building2,
    building: Building2,
    floor: Building2,
    task: TrendingUp,
    material: Package,
    contractor: User,
    supplier: Package,
    milestone: AlertTriangle
  }

  const TypeIcon = typeIcons[node.data.type] || TrendingUp

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-dark-900 border-l border-dark-700 shadow-2xl z-50 animate-slide-in flex flex-col">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <TypeIcon className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white truncate">{node.data.label}</h3>
            <p className="text-xs text-dark-400 capitalize">{node.data.type}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded-lg text-dark-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : details ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-dark-400 uppercase tracking-wider">Details</h4>
              <div className="space-y-2">
                {details.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Status</span>
                    <span className={`badge ${details.status === 'completed' ? 'badge-green' : details.status === 'in_progress' ? 'badge-blue' : details.status === 'blocked' || details.status === 'delayed' ? 'badge-red' : 'badge-amber'}`}>
                      {details.status}
                    </span>
                  </div>
                )}
                {details.progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-dark-300">Progress</span>
                      <span className="text-white font-medium">{details.progress}%</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${details.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {details.delay_days > 0 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">{details.delay_days} days delayed</span>
                  </div>
                )}
                {details.floor && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Floor</span>
                    <span className="text-white font-medium">{details.floor}</span>
                  </div>
                )}
                {details.building && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Building</span>
                    <span className="text-white font-medium">{details.building}</span>
                  </div>
                )}
                {details.quantity_planned !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Planned</span>
                    <span className="text-white font-medium">{details.quantity_planned} {details.unit}</span>
                  </div>
                )}
                {details.quantity_delivered !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Delivered</span>
                    <span className="text-white font-medium">{details.quantity_delivered} {details.unit}</span>
                  </div>
                )}
                {details.company && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Company</span>
                    <span className="text-white font-medium truncate">{details.company}</span>
                  </div>
                )}
                {details.contact_person && (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Contact</span>
                    <span className="text-white font-medium">{details.contact_person}</span>
                  </div>
                )}
              </div>
            </div>

            {node.data.type === 'material' || node.data.type === 'task' ? (
              <div className="pt-4 border-t border-dark-700 space-y-4">
                <h4 className="text-sm font-medium text-dark-400 uppercase tracking-wider">Impact Simulation</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Additional Delay (days)</label>
                    <input
                      type="number"
                      value={delayInput}
                      onChange={(e) => setDelayInput(Math.max(0, parseInt(e.target.value) || 0))}
                      min="0"
                      max="30"
                      className="input"
                    />
                  </div>
                  <button
                    onClick={runSimulation}
                    disabled={simulating}
                    className="btn-accent w-full"
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Simulating...
                      </>
                    ) : (
                      'Run Impact Analysis'
                    )}
                  </button>
                </div>

                {impact && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                    <h5 className="font-semibold text-amber-300">Simulation Results</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-dark-400">Tasks Affected</span>
                        <p className="text-white font-medium">{impact.total_affected}</p>
                      </div>
                      <div>
                        <span className="text-dark-400">Contractors Affected</span>
                        <p className="text-white font-medium">{impact.affected_contractors?.length || 0}</p>
                      </div>
                      <div>
                        <span className="text-dark-400">Milestones at Risk</span>
                        <p className="text-white font-medium">{impact.affected_milestones?.length || 0}</p>
                      </div>
                      <div>
                        <span className="text-dark-400">Projected Delay</span>
                        <p className="text-white font-medium">+{impact.projected_delay} days</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-dark-400">Risk Level</span>
                        <span className={`badge ${impact.risk_level === 'CRITICAL' ? 'badge-red' : impact.risk_level === 'HIGH' ? 'badge-red' : impact.risk_level === 'MEDIUM' ? 'badge-amber' : 'badge-green'}`}>
                          {impact.risk_level}
                        </span>
                      </div>
                    </div>
                    {impact.affected_tasks?.length > 0 && (
                      <div className="pt-2 border-t border-dark-700">
                        <p className="text-dark-400 text-sm mb-2">Affected Tasks:</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {impact.affected_tasks.slice(0, 5).map((t, i) => (
                            <div key={i} className="text-xs text-dark-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                              {t.name} ({t.floor || 'N/A'}) - {t.progress}% {t.delay_days > 0 ? `• ${t.delay_days}d delay` : ''}
                            </div>
                          ))}
                          {impact.affected_tasks.length > 5 && (
                            <p className="text-dark-500 text-xs">+{impact.affected_tasks.length - 5} more...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {details.progress_sources && Object.keys(details.progress_sources).length > 1 && (
              <div className="pt-4 border-t border-dark-700 space-y-3">
                <h4 className="text-sm font-medium text-dark-400 uppercase tracking-wider">Progress Sources</h4>
                <div className="space-y-2">
                  {Object.entries(details.progress_sources).map(([source, value]) => (
                    <div key={source} className="flex items-center gap-3">
                      <span className="text-dark-400 text-sm w-24">{source}</span>
                      <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-white font-medium text-sm w-12">{value}%</span>
                    </div>
                  ))}
                  {(() => {
                    const values = Object.values(details.progress_sources)
                    const diff = Math.max(...values) - Math.min(...values)
                    return diff > 5 ? (
                      <div className={`p-2 rounded-lg ${diff > 10 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className={`w-4 h-4 ${diff > 10 ? 'text-red-400' : 'text-amber-400'}`} />
                          <span className={`${diff > 10 ? 'text-red-300' : 'text-amber-300'}`}>
                            {diff > 10 ? 'CONFLICT' : 'DISCREPANCY'}: {diff.toFixed(0)}% difference
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-dark-500 text-center py-8">No details available</p>
        )}
      </div>
    </div>
  )
}