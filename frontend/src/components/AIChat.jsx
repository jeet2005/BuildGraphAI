import { useState, useEffect, useRef } from 'react'
import { aiApi } from '../utils/api'
import { X, Send, Loader2, Bot, User, Mic, Settings, Copy, ThumbsUp, ThumbsDown } from 'lucide-react'

export default function AIChat({ isOpen, onClose, projectId, role }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your BuildGraph AI assistant. Ask me anything about the project — delays, conflicts, decisions, or what to focus on today.", timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([
    "What's wrong with the project?",
    "Why is Floor 4 delayed?",
    "What happens if steel is delayed 5 days?",
    "Why was Supplier B selected?",
    "What should I focus on today?"
  ])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)
    setSuggestions([])

    try {
      const res = await aiApi.chat(projectId, { question: currentInput, role })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.message,
        timestamp: new Date(),
        metadata: res.data
      }])

      if (res.data.actions?.length) {
        setSuggestions(res.data.actions.map(a => a.label))
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting to the AI service. Please try again or check if Ollama is running locally.",
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const useSuggestion = (suggestion) => {
    setInput(suggestion)
    sendMessage()
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md lg:max-w-lg animate-slide-in">
      <div className="bg-dark-900/95 backdrop-blur-sm border border-dark-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">BuildGraph AI</h3>
              <p className="text-xs text-dark-400">Connected Intelligence Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-dark-800 rounded-lg text-dark-400" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg text-dark-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-500' : 'bg-primary-500/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-primary-400" />}
              </div>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-white border border-dark-700'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.metadata?.actions?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.metadata.actions.map((action, ai) => (
                        <button
                          key={ai}
                          onClick={() => useSuggestion(action.label)}
                          className="px-2 py-1 text-xs bg-primary-500/20 border border-primary-500/30 rounded text-primary-300 hover:bg-primary-500/30"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1 text-xs text-dark-500">
                  <span>{msg.timestamp.toLocaleTimeString()}</span>
                  {msg.role === 'assistant' && (
                    <>
                      <button className="p-1 hover:text-green-400" title="Helpful"><ThumbsUp className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-red-400" title="Not helpful"><ThumbsDown className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-primary-400" title="Copy"><Copy className="w-3 h-3" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-400 animate-pulse" />
              </div>
              <div className="bg-dark-800 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {suggestions.length > 0 && !loading && (
          <div className="px-4 py-2 border-t border-dark-700 bg-dark-950/50">
            <p className="text-xs text-dark-500 mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => useSuggestion(s)}
                  className="px-3 py-1 text-xs bg-dark-800 border border-dark-600 rounded-full text-dark-300 hover:border-primary-500 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-dark-700 bg-dark-950/50">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the project..."
              className="input flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={loading}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="btn-primary p-3 rounded-xl flex-shrink-0 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-dark-500 mt-2 text-center">Enter to send • Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}