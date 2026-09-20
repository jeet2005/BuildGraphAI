import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const projectApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
}

export const graphApi = {
  getGraph: (projectId, params) => api.get(`/graph/${projectId}`, { params }),
  getHighlighted: (projectId, entityId, depth) => api.get(`/graph/${projectId}/highlight/${entityId}`, { params: { depth } })
}

export const entityApi = {
  getTasks: (projectId, params) => api.get(`/entities/${projectId}/tasks`, { params }),
  getTask: (projectId, taskId) => api.get(`/entities/${projectId}/tasks/${taskId}`),
  getMaterials: (projectId) => api.get(`/entities/${projectId}/materials`),
  getMaterial: (projectId, materialId) => api.get(`/entities/${projectId}/materials/${materialId}`),
  getContractors: (projectId) => api.get(`/entities/${projectId}/contractors`),
  getContractor: (projectId, contractorId) => api.get(`/entities/${projectId}/contractors/${contractorId}`),
  getSuppliers: (projectId) => api.get(`/entities/${projectId}/suppliers`),
  getRelationships: (projectId, params) => api.get(`/entities/${projectId}/relationships`, { params })
}

export const impactApi = {
  analyze: (projectId, data) => api.post(`/impact/${projectId}/analyze`, data),
  getMaterialImpact: (projectId, materialId, additionalDelay) => api.get(`/impact/${projectId}/material/${materialId}`, { params: { additional_delay: additionalDelay } }),
  getTaskImpact: (projectId, taskId, additionalDelay) => api.get(`/impact/${projectId}/task/${taskId}`, { params: { additional_delay: additionalDelay } })
}

export const conflictApi = {
  getConflicts: (projectId) => api.get(`/conflicts/${projectId}`),
  getTrustScore: (projectId) => api.get(`/conflicts/${projectId}/trust`),
  getEntityTrust: (projectId, entityId) => api.get(`/conflicts/${projectId}/entity/${entityId}/trust`)
}

export const aiApi = {
  chat: (projectId, data) => api.post(`/ai/${projectId}/chat`, data),
  getBrief: (projectId, role) => api.get(`/ai/${projectId}/brief`, { params: { role } }),
  getStatus: (projectId) => api.get(`/ai/${projectId}/status`)
}

export const simulationApi = {
  simulateImpact: (projectId, data) => api.post(`/simulation/${projectId}/impact`, data),
  getImpactGraph: (projectId, data) => api.post(`/simulation/${projectId}/impact-graph`, data),
  getScenarios: (projectId) => api.get(`/simulation/${projectId}/scenarios`)
}

export const documentApi = {
  getAll: (projectId) => api.get(`/documents/${projectId}`),
  upload: (projectId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/documents/${projectId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  rebuildIndex: (projectId) => api.post(`/documents/${projectId}/rebuild-index`),
  delete: (projectId, documentId) => api.delete(`/documents/${projectId}/${documentId}`)
}

export const decisionApi = {
  getAll: (projectId) => api.get(`/decisions/${projectId}`),
  create: (projectId, data) => api.post(`/decisions/${projectId}`, data),
  search: (projectId, query) => api.get(`/decisions/${projectId}/search`, { params: { q: query } })
}

export default api