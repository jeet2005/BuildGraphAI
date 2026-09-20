import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('buildgraph_role') || null)
  const [projectId, setProjectId] = useState(() => localStorage.getItem('buildgraph_projectId') || null)
  const [userName, setUserName] = useState(() => localStorage.getItem('buildgraph_userName') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const login = useCallback((selectedRole, selectedProjectId, selectedUserName) => {
    setRole(selectedRole)
    setProjectId(selectedProjectId)
    setUserName(selectedUserName)
    localStorage.setItem('buildgraph_role', selectedRole)
    localStorage.setItem('buildgraph_projectId', selectedProjectId)
    localStorage.setItem('buildgraph_userName', selectedUserName)
  }, [])

  const logout = useCallback(() => {
    setRole(null)
    setProjectId(null)
    setUserName(null)
    localStorage.removeItem('buildgraph_role')
    localStorage.removeItem('buildgraph_projectId')
    localStorage.removeItem('buildgraph_userName')
  }, [])

  const value = {
    role,
    projectId,
    userName,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}