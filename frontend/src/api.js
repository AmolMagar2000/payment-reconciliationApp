import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE, timeout: 30_000 })

export const healthCheck   = ()       => api.get('/health')
export const generateData  = ()       => api.post('/generate-data')
export const reconcileData = (payload) => api.post('/reconcile', payload)