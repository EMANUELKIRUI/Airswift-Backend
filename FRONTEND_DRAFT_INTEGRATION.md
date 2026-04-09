# Frontend Draft Integration Guide

This repository is the backend service only. The frontend lives in a separate repo or app and can integrate with the backend using these draft APIs.

## Available backend endpoints

- `GET /api/drafts/check`
  - Returns a lightweight status for whether a saved draft exists:
  ```json
  {
    "hasDraft": true,
    "updated_at": "2026-04-09T10:00:00.000Z"
  }
  ```

- `GET /api/drafts`
  - Returns the full draft payload on the authenticated user:
  ```json
  {
    "form_data": { /* saved draft object */ }
  }
  ```

- `POST /api/drafts`
- `POST /api/drafts/save`
  - Saves draft data to the logged-in user.
  - Accepts either raw form object or a body containing `form_data`.
  - Example request body:
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "resume": "..."
    }
    ```

- `DELETE /api/drafts`
  - Clears the saved draft for the authenticated user.

## Authentication

All draft endpoints require authentication. The backend supports JWT tokens in the `Authorization` header or cookies.

Example header:
```js
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
}
```

## Recommended frontend flow

### 1. Auto-save locally and remotely

Use a debounced effect when the form changes.

```js
useEffect(() => {
  const timeout = setTimeout(() => {
    localStorage.setItem('draft', JSON.stringify(form))
    axios.post('/api/drafts/save', form)
  }, 2000)

  return () => clearTimeout(timeout)
}, [form])
```

### 2. Check for a draft after login

After successful login, call the lightweight draft check endpoint.

```js
const handleLogin = async () => {
  const res = await axios.post('/api/auth/login', form)
  const user = res.data.user

  const draftRes = await axios.get('/api/drafts/check')

  if (draftRes.data.hasDraft && !user.has_submitted) {
    setDraftInfo(draftRes.data)
    setShowModal(true)
    return
  }

  redirectUser(user)
}
```

### 3. Show a continue/start fresh modal

Render a modal when a draft exists.

```jsx
<ContinueDraftModal
  open={showModal}
  onContinue={handleContinue}
  onStartFresh={handleStartFresh}
  lastSaved={draftInfo?.updated_at}
/>
```

### 4. Handle the user choice

```js
const handleContinue = () => {
  setShowModal(false)
  router.push('/apply')
}

const handleStartFresh = async () => {
  await axios.delete('/api/drafts')
  localStorage.removeItem('draft')

  setShowModal(false)
  router.push('/apply')
}
```

### 5. Load the draft on the apply page

When the user lands on `/apply`, fetch the full draft.

```js
useEffect(() => {
  const loadDraft = async () => {
    const res = await axios.get('/api/drafts')
    if (res.data?.form_data) {
      setForm(res.data.form_data)
    }
  }

  loadDraft()
}, [])
```

## Modal UI example

```jsx
export default function ContinueDraftModal({ open, onContinue, onStartFresh, lastSaved }) {
  if (!open) return null

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="modal-content w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-3">Resume draft found</h2>
        <p className="text-sm text-slate-600 mb-4">
          We found a saved draft from {lastSaved ? new Date(lastSaved).toLocaleString() : 'an earlier session'}.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={onContinue}
          >
            Continue with saved draft
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            onClick={onStartFresh}
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Notes

- Use `localStorage` for instant client-side persistence and fallback when offline.
- Use backend drafts for cross-device sync and restore.
- The frontend repo must point to this backend using the correct `NEXT_PUBLIC_API_URL` or equivalent environment variable.
- The backend itself does not include frontend code, so these changes belong in the frontend application.
