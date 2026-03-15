import { useEffect, useMemo, useState } from 'react'
import reactLogo from './assets/react.svg';
import ScheduleTestModule from './components/ScheduleTestModule';
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

type ScheduleType = 'per-day' | 'testing-windows'

type DayKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

interface TestingWindow {
  id: number
  label: string
  enabled: boolean
  start: string
  end: string
}

interface SavedSchedule {
  version: number
  scheduleType: ScheduleType
  days: Record<DayKey, boolean>
  windows: TestingWindow[]
  bufferMinutes: number
  timeZone: string
  updatedAt: string
}

const STORAGE_KEY = 'keepr-portal-testing-window-schedule'

const dayLabels: Array<{ key: DayKey; label: string }> = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
]

const defaultDays = (): Record<DayKey, boolean> => ({
  sunday: false,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
})

const defaultWindows = (): TestingWindow[] => [
  { id: 1, label: 'Testing window 1', enabled: true, start: '06:00', end: '08:00' },
  { id: 2, label: 'Testing window 2', enabled: true, start: '17:00', end: '19:00' },
  { id: 3, label: 'Testing window 3', enabled: true, start: '22:00', end: '23:59' },
  { id: 4, label: 'Testing window 4', enabled: false, start: '12:00', end: '13:00' },
]

const toMinutes = (value: string): number => {
  if (!value.includes(':')) return NaN
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN
  return hours * 60 + minutes
}
import Notification from './components/Notification';

function App() {
  const portalTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [scheduleType, setScheduleType] = useState<ScheduleType>('testing-windows')
  const [days, setDays] = useState<Record<DayKey, boolean>>(defaultDays)
  const [windows, setWindows] = useState<TestingWindow[]>(defaultWindows)
  const [bufferMinutes, setBufferMinutes] = useState<number>(15)
  const [timeZone, setTimeZone] = useState<string>(portalTimeZone)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState<string>('')

  const activeWindows = useMemo(
    () => windows.filter((windowItem) => windowItem.enabled),
    [windows],
  )

  useEffect(() => {
    const rawSaved = localStorage.getItem(STORAGE_KEY)
    if (!rawSaved) return

    try {
      const parsed = JSON.parse(rawSaved) as SavedSchedule
      if (parsed.version !== 1) return
      if (!parsed.windows || parsed.windows.length !== 4) return

      setScheduleType(parsed.scheduleType)
      setDays(parsed.days)
      setWindows(parsed.windows)
      setBufferMinutes(parsed.bufferMinutes)
      setTimeZone(parsed.timeZone)
      setStatus(`Loaded saved schedule from ${new Date(parsed.updatedAt).toLocaleString()}.`)
    } catch {
      setStatus('Unable to load saved schedule; defaults restored.')
    }
  }, [])

  const validateSchedule = (): string[] => {
    const validationErrors: string[] = []

    const selectedDays = Object.values(days).some(Boolean)
    if (!selectedDays) {
      validationErrors.push('At least one day of the week must be selected.')
    }

    if (scheduleType !== 'testing-windows') {
      return validationErrors
    }

    if (activeWindows.length === 0) {
      validationErrors.push('At least one testing window must be enabled.')
      return validationErrors
    }

    const normalized = activeWindows.map((windowItem) => {
      const start = toMinutes(windowItem.start)
      const end = toMinutes(windowItem.end)

      if (!windowItem.start || !windowItem.end || Number.isNaN(start) || Number.isNaN(end)) {
        validationErrors.push(`Start and end time are required for ${windowItem.label}.`)
      } else if (end <= start) {
        validationErrors.push(`End time must be after start time for Testing window ${windowItem.id}.`)
      }

      return {
        id: windowItem.id,
        label: windowItem.label,
        start,
        end,
      }
    })

    const validRows = normalized
      .filter((item) => !Number.isNaN(item.start) && !Number.isNaN(item.end) && item.end > item.start)
      .sort((a, b) => a.start - b.start)

    for (let i = 0; i < validRows.length - 1; i += 1) {
      const current = validRows[i]
      const next = validRows[i + 1]

      if (current.end > next.start) {
        validationErrors.push(
          `Testing window ${current.id} and Testing window ${next.id} overlap. Please adjust the times.`,
        )
      } else {
        const gap = next.start - current.end
        if (gap < bufferMinutes) {
          validationErrors.push(
            `Testing window ${current.id} and Testing window ${next.id} must have at least ${bufferMinutes} minutes of buffer.`,
          )
        }
      }
    }

    return validationErrors
  }

  const handleDayToggle = (day: DayKey) => {
    setDays((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  const handleWindowToggle = (id: number) => {
    setWindows((prev) =>
      prev.map((windowItem) =>
        windowItem.id === id ? { ...windowItem, enabled: !windowItem.enabled } : windowItem,
      ),
    )
  }

  const handleWindowTimeChange = (id: number, field: 'start' | 'end', value: string) => {
    setWindows((prev) =>
      prev.map((windowItem) => (windowItem.id === id ? { ...windowItem, [field]: value } : windowItem)),
    )
  }

  const handleReset = () => {
    setScheduleType('testing-windows')
    setDays(defaultDays)
    setWindows(defaultWindows)
    setBufferMinutes(15)
    setTimeZone(portalTimeZone)
    setErrors([])
    setStatus('Form reset to default testing window configuration.')
  }

  const handleSave = () => {
    const validationErrors = validateSchedule()
    setErrors(validationErrors)

    if (validationErrors.length > 0) {
      setStatus('Fix the validation errors before saving.')
      return
    }

    const payload: SavedSchedule = {
      version: 1,
      scheduleType,
      days,
      windows,
      bufferMinutes,
      timeZone,
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setStatus(`Schedule saved at ${new Date(payload.updatedAt).toLocaleString()}.`)
  }

  const handleLoad = () => {
    const rawSaved = localStorage.getItem(STORAGE_KEY)
    if (!rawSaved) {
      setStatus('No saved schedule found.')
      return
    }

    try {
      const parsed = JSON.parse(rawSaved) as SavedSchedule
      if (parsed.version !== 1 || !parsed.windows || parsed.windows.length !== 4) {
        setStatus('Saved schedule format is not supported.')
        return
      }

      setScheduleType(parsed.scheduleType)
      setDays(parsed.days)
      setWindows(parsed.windows)
      setBufferMinutes(parsed.bufferMinutes)
      setTimeZone(parsed.timeZone)
      setErrors([])
      setStatus(`Loaded schedule from ${new Date(parsed.updatedAt).toLocaleString()}.`)
    } catch {
      setStatus('Unable to parse saved schedule data.')
    }
  }
  const [count, setCount] = useState(0)

  return (
    <main className="portal-shell">
      <header className="page-header">
        <p className="eyebrow">Keepr Portal</p>
        <h1>Schedule Test</h1>
        <p className="subhead">Testing window scheduling with validation, day controls, and save/load behavior.</p>
      </header>

      <section className="card type-card">
        <h2>Schedule Type</h2>
        <div className="type-toggle" role="radiogroup" aria-label="Schedule type">
          <label className={`chip ${scheduleType === 'per-day' ? 'active' : ''}`}>
            <input
              type="radio"
              name="schedule-type"
              checked={scheduleType === 'per-day'}
              onChange={() => setScheduleType('per-day')}
            />
            <span>Per-day-of-week</span>
          </label>
          <label className={`chip ${scheduleType === 'testing-windows' ? 'active' : ''}`}>
            <input
              type="radio"
              name="schedule-type"
              checked={scheduleType === 'testing-windows'}
              onChange={() => setScheduleType('testing-windows')}
            />
            <span>Testing windows</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Day-of-Week Applicability</h2>
        <div className="days-grid">
          {dayLabels.map((day) => (
            <label key={day.key} className="day-check">
              <input
                type="checkbox"
                checked={days[day.key]}
                onChange={() => handleDayToggle(day.key)}
              />
              <span>{day.label}</span>
            </label>
          ))}
        </div>
      </section>

      {scheduleType === 'testing-windows' ? (
        <section className="card">
          <div className="section-head">
            <h2>Testing Window Configuration</h2>
            <p>Configure up to four windows. Disabled windows retain time values but do not run.</p>
          </div>

          <div className="controls-row">
            <label className="inline-field" htmlFor="bufferMinutes">
              <span>Buffer between windows (minutes)</span>
              <input
                id="bufferMinutes"
                type="number"
                min={1}
                max={180}
                step={1}
                value={bufferMinutes}
                onChange={(event) => setBufferMinutes(Number(event.target.value) || 1)}
              />
            </label>

            <label className="inline-field" htmlFor="timeZoneInput">
              <span>Portal Time Zone</span>
              <input
                id="timeZoneInput"
                type="text"
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
              />
            </label>
          </div>

          <div className="window-list">
            {windows.map((windowItem) => (
              <article className={`window-card ${windowItem.enabled ? 'enabled' : 'disabled'}`} key={windowItem.id}>
                <div className="window-head">
                  <h3>{windowItem.label}</h3>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={windowItem.enabled}
                      onChange={() => handleWindowToggle(windowItem.id)}
                    />
                    <span>{windowItem.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <div className="window-grid">
                  <label htmlFor={`start-${windowItem.id}`}>
                    <span>Start time</span>
                    <input
                      id={`start-${windowItem.id}`}
                      type="time"
                      value={windowItem.start}
                      onChange={(event) =>
                        handleWindowTimeChange(windowItem.id, 'start', event.target.value)
                      }
                    />
                  </label>
                  <label htmlFor={`end-${windowItem.id}`}>
                    <span>End time</span>
                    <input
                      id={`end-${windowItem.id}`}
                      type="time"
                      value={windowItem.end}
                      onChange={(event) => handleWindowTimeChange(windowItem.id, 'end', event.target.value)}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="card muted">
          <h2>Per-day-of-week Schedule</h2>
          <p>The existing scheduling mode remains available. Day selection above is still applied to this schedule type.</p>
        </section>
      )}

      {errors.length > 0 && (
        <section className="card error-card" aria-live="polite">
          <h2>Validation Errors</h2>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card summary-card">
        <h2>Current Summary</h2>
        <p>
          Active windows: <strong>{activeWindows.length}</strong> / 4
        </p>
        <p>
          Selected days:{' '}
          <strong>
            {dayLabels
              .filter((day) => days[day.key])
              .map((day) => day.label)
              .join(', ') || 'None'}
          </strong>
        </p>
      </section>

      <footer className="action-row">
        <button type="button" className="ghost" onClick={handleReset}>
          Reset
        </button>
        <button type="button" className="ghost" onClick={handleLoad}>
          Load Saved
        </button>
        <button type="button" className="primary" onClick={handleSave}>
          Save Schedule
        </button>
      </footer>

      {status && <p className="status-line">{status}</p>}
    </main>
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <ScheduleTestModule />
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
