export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export async function runWorkflow(payload) {
  let response
  try {
    response = await fetch(`${API_BASE}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(`Backend is not reachable at ${API_BASE}. Start the FastAPI server, then try again.`)
  }

  if (!response.ok) {
    let message = `Workflow request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      const detail = Array.isArray(errorBody.detail)
        ? errorBody.detail.map((item) => item.msg).join(', ')
        : errorBody.detail
      if (detail) message = detail
    } catch {
      // Keep the status-based message if the backend did not return JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

export async function uploadFiles(files, sessionId) {
  const formData = new FormData()
  Array.from(files).forEach((file) => formData.append('files', file))
  if (sessionId) formData.append('session_id', sessionId)

  let response
  try {
    response = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(`Backend is not reachable at ${API_BASE}. Start the FastAPI server, then try again.`)
  }

  if (!response.ok) {
    throw new Error(`File upload failed with status ${response.status}`)
  }

  return response.json()
}

export async function uploadRecordings(files, sessionId) {
  const formData = new FormData()
  Array.from(files).forEach((file) => formData.append('files', file))
  if (sessionId) formData.append('session_id', sessionId)

  let response
  try {
    response = await fetch(`${API_BASE}/api/recordings/upload`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(`Backend is not reachable at ${API_BASE}. Start the FastAPI server, then try again.`)
  }

  if (!response.ok) {
    throw new Error(`Recording upload failed with status ${response.status}`)
  }

  return response.json()
}

export async function getHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/history`)
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export async function getProviderStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/providers/status`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function getAnalytics() {
  try {
    const response = await fetch(`${API_BASE}/api/analytics`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function sendFeedback(payload) {
  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Feedback failed with status ${response.status}`)
  }
  return response.json()
}

export async function getChats() {
  try {
    const response = await fetch(`${API_BASE}/api/chats`)
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export async function getChat(sessionId) {
  const response = await fetch(`${API_BASE}/api/chats/${sessionId}`)
  if (!response.ok) {
    throw new Error(`Chat load failed with status ${response.status}`)
  }
  return response.json()
}

export async function createChat(title = 'New Chat') {
  const response = await fetch(`${API_BASE}/api/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) {
    throw new Error(`Chat creation failed with status ${response.status}`)
  }
  return response.json()
}

export async function renameChat(sessionId, title) {
  const response = await fetch(`${API_BASE}/api/chats/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) {
    throw new Error(`Chat rename failed with status ${response.status}`)
  }
  return response.json()
}

export async function deleteChat(sessionId) {
  const response = await fetch(`${API_BASE}/api/chats/${sessionId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Chat delete failed with status ${response.status}`)
  }
  return response.json()
}

export async function deleteMessage(sessionId, messageId) {
  const response = await fetch(`${API_BASE}/api/chats/${sessionId}/messages/${messageId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Message delete failed with status ${response.status}`)
  }
  return response.json()
}

export async function applyAutomation(payload) {
  const response = await fetch(`${API_BASE}/api/automation/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Automation apply failed with status ${response.status}`)
  }
  return response.json()
}

export async function getLearningReport() {
  try {
    const response = await fetch(`${API_BASE}/api/learning/report`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function approvePromptVersion(payload) {
  const response = await fetch(`${API_BASE}/api/learning/approve-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Prompt approval failed with status ${response.status}`)
  return response.json()
}

export async function rejectPromptVersion(payload) {
  const response = await fetch(`${API_BASE}/api/learning/reject-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Prompt rejection failed with status ${response.status}`)
  return response.json()
}

export async function rollbackPromptVersion(payload) {
  const response = await fetch(`${API_BASE}/api/learning/rollback-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Prompt rollback failed with status ${response.status}`)
  return response.json()
}
