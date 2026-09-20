import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { decisionApi, aiApi } from '../utils/api'
import { Search, BookOpen, Clock, Users, Tag, Filter, Loader2, ArrowLeft, Brain, MessageSquare } from 'lucide-react'

const decisionTypes = {
  procurement: { label: 'Procurement', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Tag },
  schedule: { label: 'Schedule', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  technical: { label: 'Technical', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: BookOpen },
  risk: { label: 'Risk', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
  contractual: { label: 'Contractual', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Users }
}

export default function ProjectMemory() {
  const { projectId, role } = useAuth()
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedDecision, setSelectedDecision] = useState(null)
  const [askingAI, setAskingAI] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')

  useEffect(() => {
    loadDecisions()
  }, [projectId])

  const loadDecisions = async () => {
    setLoading(true)
    try {
      const res = await decisionApi.getAll(projectId)
      setDecisions(res.data)
    } catch (error) {
      console.error('Failed to load decisions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDecisions = decisions.filter(d => {
    if (filterType !== 'all' && d.decision_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!d.title.toLowerCase().includes(q) &&
          !d.reason.toLowerCase().includes(q) &&
          !d.description.toLowerCase().includes(q) &&
          !d.people_involved?.some(p => p.toLowerCase().includes(q))) {
        return false
      }
    }
    return true
  })

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const askAI = async (decision) => {
    setAskingAI(true)
    setAiAnswer('')
    try {
      const res = await aiApi.chat(projectId, {
        question: `Why was this decision made: ${decision.title}? ${decision.description}`,
        role
      })
      setAiAnswer(res.data.message)
    } catch (error) {
      setAiAnswer('Unable to get AI explanation at this moment.')
    } finally {
      setAskingAI(false)
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
          <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Project Memory</h1>
            <p className="text-dark-400">Decisions, rationale, and institutional knowledge</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Search & Filter</h3>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search decisions..."
                  className="input pl-10"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="procurement">Procurement</option>
                <option value="schedule">Schedule</option>
                <option value="technical">Technical</option>
                <option value="risk">Risk</option>
                <option value="contractual">Contractual</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Ask AI</h3>
            <p className="text-dark-400 text-sm mb-4">Select a decision and ask why it was made</p>
            {selectedDecision && (
              <div className="space-y-3">
                <p className="text-sm text-dark-300 bg-dark-800/50 p-2 rounded">
                  <strong>Selected:</strong> {selectedDecision.title}
                </p>
                <button
                  onClick={() => askAI(selectedDecision)}
                  disabled={askingAI}
                  className="btn-primary w-full"
                >
                  {askingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Asking AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Why was this decided?
                    </>
                  )}
                </button>
                {aiAnswer && (
                  <div className="p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg text-sm text-dark-200">
                    {aiAnswer}
                  </div>
                )}
              </div>
            )}
            {!selectedDecision && (
              <p className="text-dark-500 text-sm">Select a decision from the list to enable AI queries</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Decision Types</h3>
            <div className="space-y-2">
              {Object.entries(decisionTypes).map(([key, config]) => {
                const count = decisions.filter(d => d.decision_type === key).length
                const Icon = config.icon
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-800/50">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {config.label}
                      </span>
                    </div>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">All Decisions ({filteredDecisions.length})</h3>
              {selectedDecision && (
                <button onClick={() => setSelectedDecision(null)} className="btn-secondary text-sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Clear Selection
                </button>
              )}
            </div>

            {filteredDecisions.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-dark-400 mb-2">No Decisions Found</h3>
                <p className="text-dark-500">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDecisions.map((decision, i) => (
                  <button
                    key={decision._id}
                    onClick={() => setSelectedDecision(decision)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      selectedDecision?._id === decision._id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-primary-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${decisionTypes[decision.decision_type]?.color || 'bg-dark-600 text-dark-300'}`}>
                            {decisionTypes[decision.decision_type]?.label || decision.decision_type}
                          </span>
                          <span className="text-dark-400 text-sm">{formatDate(decision.date)}</span>
                        </div>
                        <h4 className="font-semibold text-white mb-1 truncate">{decision.title}</h4>
                        <p className="text-dark-400 text-sm line-clamp-2">{decision.reason}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {decision.people_involved?.slice(0, 3).map((person, pi) => (
                            <span key={pi} className="px-2 py-1 bg-dark-800 rounded text-xs text-dark-300">
                              {person}
                            </span>
                          ))}
                          {decision.people_involved?.length > 3 && (
                            <span className="px-2 py-1 bg-dark-800 rounded text-xs text-dark-400">
                              +{decision.people_involved.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedDecision?._id === decision._id && (
                        <div className="flex items-center gap-2 text-primary-400">
                          <MessageSquare className="w-5 h-5" />
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedDecision && (
            <div className="card mt-6 border-primary-500/30 bg-primary-500/5 animate-slide-in">
              <h3 className="text-lg font-semibold text-white mb-4">Decision Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-dark-400 text-sm">Title</p>
                  <p className="text-white font-medium">{selectedDecision.title}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Description</p>
                  <p className="text-dark-300">{selectedDecision.description}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Reason / Rationale</p>
                  <p className="text-dark-300">{selectedDecision.reason}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Decision Type</p>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${decisionTypes[selectedDecision.decision_type]?.color || 'bg-dark-600 text-dark-300'}`}>
                    {decisionTypes[selectedDecision.decision_type]?.label || selectedDecision.decision_type}
                  </span>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Date</p>
                  <p className="text-white">{formatDate(selectedDecision.date)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">People Involved</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDecision.people_involved?.map((person, pi) => (
                      <span key={pi} className="px-3 py-1 bg-dark-800 rounded text-sm text-dark-300">
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedDecision.related_entities && selectedDecision.related_entities.length > 0 && (
                  <div>
                    <p className="text-dark-400 text-sm">Related Entities</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDecision.related_entities.map((entity, ei) => (
                        <span key={ei} className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded text-sm text-primary-300">
                          {entity.type}: {entity.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}