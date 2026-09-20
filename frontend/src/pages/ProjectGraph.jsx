import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { graphApi, entityApi } from '../utils/api'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge } from '@xyflow/react'
import { Search, Target, ZoomIn, ZoomOut, RotateCcw, Info, ChevronLeft, ChevronRight, X } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import NodePanel from '../components/NodePanel'

const nodeTypes = {}
const edgeTypes = {}

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

function CustomNode({ data, selected, onClick }) {
  const { label, type, style = {} } = data
  const typeStyle = typeStyles[type] || typeStyles.task
  const isHighlighted = style.border?.includes('#22d3ee') || style.boxShadow?.includes('#22d3ee')

  return (
    <div
      className="react-flow__node"
      style={{
        width: 180,
        padding: '12px',
        background: typeStyle.bg,
        border: `2px solid ${isHighlighted ? '#22d3ee' : typeStyle.border}`,
        borderRadius: '12px',
        color: 'white',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: isHighlighted ? '0 0 20px #22d3ee' : style.boxShadow || '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        ...style
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(data)
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: '16px' }}>{typeStyle.icon}</span>
        <span className="truncate">{label}</span>
        {selected && <Target className="w-4 h-4 text-cyan-300" />}
      </div>
      <div className="text-xs text-gray-300 truncate">{type}</div>
    </div>
  )
}

CustomNode.displayName = 'CustomNode'

export default function ProjectGraph() {
  const { projectId } = useAuth()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIds, setHighlightedIds] = useState(new Set())
  const [selectedNode, setSelectedNode] = useState(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })

  const fetchGraph = useCallback(async (entityId = null, depth = 2) => {
    setLoading(true)
    try {
      const response = await graphApi.getGraph(projectId, { entity_id: entityId, depth })
      const { nodes: nodeData, edges: edgeData } = response.data

      const newNodes = nodeData.map(n => ({
        id: n.id,
        type: 'custom',
        position: n.position || { x: Math.random() * 800, y: Math.random() * 600 },
        data: { ...n.data, label: n.label, type: n.type, style: n.style },
        style: n.style
      }))

      const newEdges = edgeData.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: e.label,
        style: e.style,
        animated: e.style?.stroke === '#22d3ee'
      }))

      setNodes(newNodes)
      setEdges(newEdges)

      if (entityId) {
        setHighlightedIds(new Set(nodeData.filter(n => n.style?.border?.includes('#22d3ee')).map(n => n.id)))
      } else {
        setHighlightedIds(new Set())
      }
    } catch (error) {
      console.error('Failed to fetch graph:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, setNodes, setEdges])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({ ...params, type: 'smoothstep', animated: true }, eds))
  }, [setEdges])

  const handleNodeClick = useCallback(async (nodeData) => {
    setSelectedNode(nodeData)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const tasks = await entityApi.getTasks(projectId)
      const materials = await entityApi.getMaterials(projectId)
      const allEntities = [...tasks.data, ...materials.data]

      const match = allEntities.find(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code?.toLowerCase().includes(searchQuery.toLowerCase())
      )

      if (match) {
        fetchGraph(match._id, 2)
        setHighlightedIds(new Set([match._id]))
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const clearHighlight = () => {
    setHighlightedIds(new Set())
    fetchGraph()
    setSearchQuery('')
    setSelectedNode(null)
  }

  const fitView = () => {
    if (nodes.length > 0) {
      // React Flow will auto-fit on mount
    }
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center bg-dark-900/50 rounded-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Project Graph</h2>
          <span className="px-3 py-1 bg-primary-500/20 border border-primary-500/30 rounded-full text-sm text-primary-300">
            {nodes.length} nodes · {edges.length} connections
          </span>
          {highlightedIds.size > 0 && (
            <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-300 animate-pulse">
              {highlightedIds.size} highlighted
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search entity..."
              className="input pl-10 w-64"
            />
          </div>
          <button onClick={handleSearch} className="btn-secondary" title="Search">Search</button>
          <button onClick={clearHighlight} className="btn-secondary" title="Clear highlight">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={fitView} className="btn-secondary" title="Fit view">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onViewportChange={setViewport}
          nodeTypes={{ custom: CustomNode }}
          edgeTypes={edgeTypes}
          fitView={true}
          attributionPosition="bottom-left"
        >
          <Background color="#1e293b" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const typeStyle = typeStyles[node.data?.type] || typeStyles.task
              return typeStyle.border
            }}
            maskColor="rgba(34, 211, 228, 0.3)"
          />
        </ReactFlow>

        {highlightedIds.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-slide-in">
            <div className="bg-cyan-500/90 text-dark-950 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
              <Info className="w-4 h-4" />
              <span className="font-medium">{highlightedIds.size} nodes highlighted from AI query</span>
              <button onClick={clearHighlight} className="ml-2 p-1 hover:bg-white/20 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}
