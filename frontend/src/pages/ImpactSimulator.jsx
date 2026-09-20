import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { simulationApi, entityApi } from '../utils/api'
import { AlertTriangle, TrendingUp, TrendingDown, Users, Target, Loader2, Zap, Package, Building2, RotateCcw } from 'lucide-react'
import ReactFlow, { Background, Controls, MiniMap, NodeTypes, EdgeTypes, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const typeStyles = {
  project: { bg: '#1e3a8a', border: '#3b82f6', icon: '🏗️' },
  building: { bg: '#1e40af', border: '#60a5fa', icon: '🏢' },
  floor: { bg: '#1e40af', border: '#60a5fa', icon: '🏬' },
  task: { bg: '#065f46', border: '#10b981', icon: '🔧' },
  material: { bg: '#92400e', border: '#f59e0b', icon: '📦' },
  contractor: { bg: '#7c2d12', border: '#ef4444', icon: '👷' },
  supplier: { bg: '#581c87', border: '#a855f7', icon: '🚚' },
  milestone: { bg: '#831843', border: '#ec4899', icon: '🎯' }
}

function SimNode({ data, selected }) {
  const { label, type, style = {} } = data
  const typeStyle = typeStyles[type] || typeStyles.task
  const isHighlighted = style.border?.includes('#22d3ee') || style.boxShadow?.includes('#22d3ee')
  const isSource = style.border === '4px solid #22d3ee'

  return (
    <div
      className="react-flow__node"
      style={{
        width: 160,
        padding: '10px',
        background: isSource ? '#0e7490' : typeStyle.bg,
        border: isHighlighted ? '4px solid #22d3ee' : `2px solid ${typeStyle.border}`,
        borderRadius: '10px',
        color: 'white',
        fontSize: '12px',
        fontWeight: 500,
        boxShadow: isHighlighted ? '0 0 20px #22d3ee' : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: '14px' }}>{typeStyle.icon}</span>
        <span className="truncate">{label}</span>
        {isSource && <Zap className="w-3 h-3 text-cyan-300 animate-pulse" />}
      </div>
      <div className="text-xs text-gray-300 truncate">{type}</div>
    </div>
  )
}

SimNode.displayName = 'SimNode'

export default function ImpactSimulator() {
  const { projectId } = useAuth()
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [impact, setImpact] = useState(null)
  const [impactGraph, setImpactGraph] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    try {
      const res = await simulationApi.getScenarios(projectId)
      setScenarios(res.data.scenarios)
    } catch (error) {
      console.error('Failed to load scenarios:', error)
    }
  }

  const runSimulation = async (scenario) => {
    setSelectedScenario(scenario)
    setSimulating(true)
    try {
      const [impactRes, graphRes] = await Promise.all([
        simulationApi.simulateImpact(projectId, {
          entity_id: scenario.id,
          entity_type: scenario.type,
          new_delay_days: scenario.suggested_delays[1]
        }),
        simulationApi.getImpactGraph(projectId, {
          entity_id: scenario.id,
          entity_type: scenario.type,
          new_delay_days: scenario.suggested_delays[1]
        })
      ])
      setImpact(impactRes.data)
      setImpactGraph(graphRes.data)
      setViewMode('graph')
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    if (impactGraph.nodes.length > 0) {
      setNodes(impactGraph.nodes.map(n => ({
        ...n,
        type: 'custom',
        position: n.position || { x: Math.random() * 800, y: Math.random() * 600 }
      })))
      setEdges(impactGraph.edges.map(e => ({
        ...e,
        type: 'smoothstep',
        animated: e.style?.stroke === '#22d3ee'
      })))
    }
  }, [impactGraph, setNodes, setEdges])

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400'
      case 'HIGH': return 'text-red-400'
      case 'MEDIUM': return 'text-amber-400'
      default: return 'text-green-400'
    }
  }

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL': return 'badge-red'
      case 'HIGH': return 'badge-red'
      case 'MEDIUM': return 'badge-amber'
      default: return 'badge-green'
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Impact Simulator</h1>
            <p className="text-dark-400">Simulate delays and visualize downstream consequences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Simulation Scenarios
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => runSimulation(scenario)}
                  disabled={simulating}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedScenario?.id === scenario.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-dark-700 hover:border-primary-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      scenario.type === 'material' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                    }`}>
                      {scenario.type === 'material' ? <Package className="w-5 h-5 text-amber-400" /> : <TrendingUp className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{scenario.name}</p>
                      <p className="text-xs text-dark-400 capitalize">{scenario.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-dark-400">Current: {scenario.current_delay}d</span>
                    <span className="text-amber-400 font-medium">Test: +{scenario.suggested_delays[1] - scenario.current_delay}d</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {impact && (
            <div className="card border-amber-500/30 bg-amber-500/5">
              <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Impact Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-dark-400 text-sm">Tasks Affected</p>
                  <p className="text-2xl font-bold text-white">{impact.total_affected}</p>
                </div>
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-dark-400 text-sm">Contractors</p>
                  <p className="text-2xl font-bold text-white">{impact.affected_contractors?.length || 0}</p>
                </div>
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-dark-400 text-sm">Milestones</p>
                  <p className="text-2xl font-bold text-white">{impact.affected_milestones?.length || 0}</p>
                </div>
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-dark-400 text-sm">Projected Delay</p>
                  <p className="text-2xl font-bold text-red-400">+{impact.projected_delay}d</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${getRiskBadge(impact.risk_level)}`}>
                  Risk: {impact.risk_level}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {viewMode === 'graph' && impactGraph.nodes.length > 0 ? (
            <div className="card h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Impact Propagation Graph
                </h3>
                <button
                  onClick={() => setViewMode('list')}
                  className="btn-secondary text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Back to List
                </button>
              </div>
              <div className="h-[440px] relative">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={{ custom: SimNode }}
                  fitView={true}
                  attributionPosition="bottom-left"
                >
                  <Background color="#1e293b" gap={16} />
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => {
                      const typeStyle = typeStyles[node.data?.type] || typeStyles.task
                      return node.data?.style?.border === '4px solid #22d3ee' ? '#22d3ee' : typeStyle.border
                    }}
                    maskColor="rgba(34, 211, 228, 0.3)"
                  />
                </ReactFlow>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 justify-center">
                  <div className="flex items-center gap-2 px-3 py-1 bg-dark-900/90 rounded-lg text-xs">
                    <div className="w-3 h-3 rounded" style={{ background: '#22d3ee' }} />
                    <span className="text-cyan-300">Source entity</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-dark-900/90 rounded-lg text-xs">
                    <div className="w-3 h-3 rounded border-2" style={{ borderColor: '#22d3ee' }} />
                    <span className="text-cyan-300">Affected downstream</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Target className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-dark-400 mb-2">Select a Scenario</h3>
                <p className="text-dark-500">Choose a delay scenario from the left to simulate impact</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {impact && impact.affected_tasks && impact.affected_tasks.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Affected Tasks Detail
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium">Floor</th>
                  <th className="pb-3 font-medium">Building</th>
                  <th className="pb-3 font-medium">Progress</th>
                  <th className="pb-3 font-medium">Current Delay</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {impact.affected_tasks.map((task, i) => (
                  <tr key={i} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{task.name}</td>
                    <td className="py-3 text-dark-300">{task.floor || 'N/A'}</td>
                    <td className="py-3 text-dark-300">{task.building || 'N/A'}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3">{task.delay_days > 0 ? `<span class="text-red-400">${task.delay_days}d</span>` : '<span class="text-green-400">On time</span>'}</td>
                    <td className="py-3">
                      <span className={`badge ${task.status === 'completed' ? 'badge-green' : task.status === 'in_progress' ? 'badge-blue' : task.status === 'blocked' ? 'badge-red' : 'badge-amber'}`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}