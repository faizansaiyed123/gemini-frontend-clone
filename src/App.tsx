import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp,
  Code2, Compass, Copy, CreditCard, Ellipsis, Eye, EyeOff, FileText, History,
  Lightbulb, LogOut, Menu, MessageCircle, Moon, MoreHorizontal, Plus, Search,
  Send, Settings, ShieldCheck, Sparkles, Sun, UserRound, X, Zap,
} from 'lucide-react'
import './styles.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://gemini-backend-q94y.onrender.com').replace(/\/+$/, '')
const TOKEN_KEY = 'gemini_token'
const THEME_KEY = 'gemini_theme'

type Envelope<T> = { code?: number; data?: T; message?: string; status?: boolean }
type Room = { chatroom_id: string; name: string; created_at: string }
type ChatMessage = { message_id: string; content: string; sender: 'user' | 'ai' | string; created_at: string }
type ChatDetail = { chatroom_id: string; name: string; created_at: string; messages: ChatMessage[] }
type Profile = { user_id: string; mobile: string; full_name?: string | null; is_verified?: boolean; created_at?: string }
type AuthMode = 'signin' | 'signup' | 'forgot'
type AuthProps = { onAuthenticated: (token: string) => void }

async function api<T>(path: string, init: RequestInit = {}, tokenOverride?: string): Promise<T> {
  const token = tokenOverride ?? window.localStorage.getItem(TOKEN_KEY) ?? ''
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', \`Bearer \${token}\`)
  let response: Response
  try {
    response = await fetch(\`\${API_BASE}\${path.startsWith('/') ? path : \`/\${path}\`}\`, { ...init, headers })
  } catch {
    throw new Error('Could not reach the API. Check your connection and the VITE_API_BASE_URL setting.')
  }
  let payload: Envelope<T> | T
  try {
    payload = await response.json() as Envelope<T> | T
  } catch {
    throw new Error(response.ok ? 'The server returned an unreadable response.' : \`Request failed (\${response.status}).\`)
  }
  const envelope = payload as Envelope<T>
  if (!response.ok || envelope?.status === false || (typeof envelope?.code === 'number' && envelope.code >= 400)) {
    throw new Error(envelope?.message || \`Request failed (\${response.status}).\`)
  }
  return (envelope && typeof envelope === 'object' && 'data' in envelope ? envelope.data : payload) as T
}

function getError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? 'brand-mark brand-mark-small' : 'brand-mark'} aria-hidden="true">
      <Sparkles size={small ? 18 : 21} strokeWidth={2.1} />
    </span>
  )
}

function AuthView({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [mobile, setMobile] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [recoveryStep, setRecoveryStep] = useState<'mobile' | 'otp' | 'password'>('mobile')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setNotice('')
    setOtp('')
    setDemoOtp('')
    setOtpSent(false)
    setRecoveryStep('mobile')
    setRecoveryToken('')
  }

  const sendLoginOtp = async () => {
    setError('')
    setNotice('')
    if (!/^\d{10,15}$/.test(mobile)) {
      setError('Enter a valid mobile number using 10–15 digits.')
      return
    }
    setBusy(true)
    try {
      const data = await api<{ otp?: string }>('/auth/send-otp', {
        method: 'POST', body: JSON.stringify({ mobile }),
      })
      setOtpSent(true)
      setDemoOtp(data?.otp || '')
      setNotice('A one-time code has been created for this number.')
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  const verifyLoginOtp = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api<{ access_token?: string }>('/auth/verify-otp', {
        method: 'POST', body: JSON.stringify({ mobile, otp }),
      })
      if (!data?.access_token) throw new Error('The API did not return an access token.')
      onAuthenticated(data.access_token)
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  const signUp = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!/^\d{10,15}$/.test(mobile)) return setError('Mobile number must contain 10–15 digits.')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()\-_=+\[\]{};:<>|./?]/.test(password)) {
      return setError('Use at least 8 characters with a letter, a number, and a special character.')
    }
    if (password !== confirmPassword) return setError('Your passwords do not match.')
    setBusy(true)
    try {
      const data = await api<{ token?: string }>('/auth/signup', {
        method: 'POST', body: JSON.stringify({ mobile, full_name: fullName.trim() || null, password }),
      })
      if (!data?.token) throw new Error('The API did not return an access token.')
      onAuthenticated(data.token)
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  const startRecovery = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!/^\d{10,15}$/.test(mobile)) return setError('Enter a valid mobile number using 10–15 digits.')
    setBusy(true)
    try {
      const data = await api<{ otp?: string }>('/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ mobile }),
      })
      setDemoOtp(data?.otp || '')
      setRecoveryStep('otp')
      setNotice('Code created. Verify it to continue to password reset.')
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  const verifyRecoveryOtp = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api<{ access_token?: string }>('/auth/verify-otp', {
        method: 'POST', body: JSON.stringify({ mobile, otp }),
      })
      if (!data?.access_token) throw new Error('The API did not return an access token.')
      setRecoveryToken(data.access_token)
      setRecoveryStep('password')
      setNotice('Number verified. Choose a new password.')
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()\-_=+\[\]{};:<>|./?]/.test(password)) {
      return setError('Use at least 8 characters with a letter, a number, and a special character.')
    }
    if (password !== confirmPassword) return setError('Your passwords do not match.')
    setBusy(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ new_password: password }) }, recoveryToken)
      onAuthenticated(recoveryToken)
    } catch (err) {
      setError(getError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-top">
          <div className="brand-lockup"><BrandMark /><span>Gemini</span></div>
          <span className="showcase-label"><span className="live-dot" /> Your AI space</span>
        </div>
        <div className="showcase-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="art-glow" />
          <div className="art-star"><Sparkles size={78} strokeWidth={1.35} /></div>
          <div className="orbit-node node-a"><Lightbulb size={19} /></div>
          <div className="orbit-node node-b"><Code2 size={20} /></div>
          <div className="orbit-node node-c"><FileText size={19} /></div>
          <div className="orbit-node node-d"><Compass size={19} /></div>
          <span className="floating-note note-a">A fresh perspective</span>
          <span className="floating-note note-b">Ideas, meet possibility</span>
        </div>
        <div className="showcase-copy">
          <p className="eyebrow">A little more inspired</p>
          <h1>Make space for<br /><span>your next big idea.</span></h1>
          <p>Think out loud, find your flow, and turn the curious little “what ifs” into something wonderful.</p>
          <div className="showcase-points"><span><Check size={15} /> Your conversations, all in one place</span><span><Check size={15} /> Made for the way you think</span></div>
        </div>
        <div className="auth-footer"><span>Thoughtful technology, human possibilities.</span><span>© 2026 Gemini workspace</span></div>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand"><BrandMark /><span>Gemini</span></div>
        <div className="auth-card">
          {mode !== 'forgot' ? (
            <>
              <div className="auth-heading">
                <span className="auth-kicker">{mode === 'signin' ? 'WELCOME BACK' : 'YOUR NEXT CHAPTER'}</span>
                <h2>{mode === 'signin' ? 'Good to see you.' : 'Let’s get you started.'}</h2>
                <p>{mode === 'signin' ? 'Sign in to pick up right where your curiosity left off.' : 'Create an account and give your ideas a little more room.'}</p>
              </div>
              <div className="auth-tabs">
                <button className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('signin')} type="button">Sign in</button>
                <button className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('signup')} type="button">Create account</button>
              </div>
              {mode === 'signin' ? (
                <form className="auth-form" onSubmit={verifyLoginOtp}>
                  <label className="field-label" htmlFor="login-mobile">Mobile number</label>
                  <div className="input-wrap"><span className="input-prefix">+ </span><input id="login-mobile" inputMode="numeric" autoComplete="tel" placeholder="Enter your mobile number" value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 15)); setOtpSent(false); setDemoOtp(''); }} disabled={otpSent} /></div>
                  {!otpSent ? (
                    <button className="primary-button" type="button" onClick={sendLoginOtp} disabled={busy}>{busy ? <span className="spinner" /> : null} Send sign-in code <ArrowRight size={17} /></button>
                  ) : (
                    <>
                      <div className="field-row"><label className="field-label" htmlFor="login-otp">6-digit verification code</label><button type="button" className="inline-link" onClick={() => { setOtpSent(false); setOtp(''); setNotice(''); }}>Change number</button></div>
                      <input className="text-input otp-input" id="login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                      {demoOtp && <div className="demo-code"><ShieldCheck size={15} /><span>Test code from your current backend</span><strong>{demoOtp}</strong><button type="button" aria-label="Use test code" onClick={() => setOtp(demoOtp)}>Use code</button></div>}
                      <button className="primary-button" type="submit" disabled={busy || otp.length < 4}>{busy ? <span className="spinner" /> : null} Verify and continue <ArrowRight size={17} /></button>
                    </>
                  )}
                  <button className="quiet-link recovery-link" type="button" onClick={() => switchMode('forgot')}>Forgot your password?</button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={signUp}>
                  <label className="field-label" htmlFor="signup-name">Your name <span className="optional">(optional)</span></label>
                  <input className="text-input" id="signup-name" autoComplete="name" placeholder="What should we call you?" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <label className="field-label" htmlFor="signup-mobile">Mobile number</label>
                  <input className="text-input" id="signup-mobile" inputMode="numeric" autoComplete="tel" placeholder="10–15 digit mobile number" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))} />
                  <label className="field-label" htmlFor="signup-password">Create password</label>
                  <div className="password-wrap"><input id="signup-password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                  <label className="field-label" htmlFor="signup-confirm">Confirm password</label>
                  <input className="text-input" id="signup-confirm" autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Type your password again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <p className="field-hint">Use 8+ characters, including a letter, a number, and a symbol.</p>
                  <button className="primary-button" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : null} Create my account <ArrowRight size={17} /></button>
                </form>
              )}
            </>
          ) : (
            <>
              <button className="back-link" type="button" onClick={() => switchMode('signin')}><ArrowLeft size={16} /> Back to sign in</button>
              <div className="auth-heading">
                <span className="auth-kicker">ACCOUNT RECOVERY</span>
                <h2>{recoveryStep === 'mobile' ? 'Let’s get you back in.' : recoveryStep === 'otp' ? 'Check your number.' : 'Make a fresh start.'}</h2>
                <p>{recoveryStep === 'mobile' ? 'Enter the mobile number linked to your account.' : recoveryStep === 'otp' ? 'Verify the one-time code to continue.' : 'Choose a new password for your account.'}</p>
              </div>
              {recoveryStep === 'mobile' && <form className="auth-form" onSubmit={startRecovery}>
                <label className="field-label" htmlFor="forgot-mobile">Mobile number</label>
                <input className="text-input" id="forgot-mobile" inputMode="numeric" placeholder="10–15 digit mobile number" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))} />
                <button className="primary-button" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : null} Send recovery code <ArrowRight size={17} /></button>
              </form>}
              {recoveryStep === 'otp' && <form className="auth-form" onSubmit={verifyRecoveryOtp}>
                <label className="field-label" htmlFor="recovery-otp">Verification code</label>
                <input className="text-input otp-input" id="recovery-otp" inputMode="numeric" maxLength={6} placeholder="••••••" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                {demoOtp && <div className="demo-code"><ShieldCheck size={15} /><span>Test code from backend</span><strong>{demoOtp}</strong><button type="button" onClick={() => setOtp(demoOtp)}>Use code</button></div>}
                <button className="primary-button" type="submit" disabled={busy || otp.length < 4}>{busy ? <span className="spinner" /> : null} Verify code <ArrowRight size={17} /></button>
              </form>}
              {recoveryStep === 'password' && <form className="auth-form" onSubmit={resetPassword}>
                <label className="field-label" htmlFor="recovery-password">New password</label>
                <div className="password-wrap"><input id="recovery-password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Choose a strong password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                <label className="field-label" htmlFor="recovery-confirm">Confirm new password</label>
                <input className="text-input" id="recovery-confirm" autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Type it again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button className="primary-button" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : null} Reset password <ArrowRight size={17} /></button>
              </form>}
            </>
          )}
          {error && <div className="form-alert error-alert" role="alert">{error}</div>}
          {notice && <div className="form-alert success-alert" role="status"><Check size={15} /> {notice}</div>}
          <div className="auth-legal"><ShieldCheck size={15} /><span>Your account is secured with token-based authentication.</span></div>
        </div>
        <div className="auth-panel-footer"><span>By continuing, you agree to use AI thoughtfully.</span><button type="button" onClick={() => setNotice('This workspace connects to the API configured for this deployment.')}>Need help? <CircleHelp size={14} /></button></div>
      </section>
    </main>
  )
}

const starterPrompts = [
  { icon: Lightbulb, tone: 'lavender', title: 'Spark a new idea', text: 'Give me 5 creative ideas for a side project I could start this month.' },
  { icon: Code2, tone: 'mint', title: 'Make code make sense', text: 'Explain APIs like I’m a curious beginner, with a simple real-world example.' },
  { icon: FileText, tone: 'peach', title: 'Write with confidence', text: 'Help me write a clear, friendly message asking for feedback on my work.' },
  { icon: Compass, tone: 'blue', title: 'Explore something new', text: 'Teach me an unexpectedly useful concept in less than 2 minutes.' },
]

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '')
  const [isLoading, setIsLoading] = useState(() => Boolean(window.localStorage.getItem(TOKEN_KEY)))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const activeChatRef = useRef<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [waitingForReply, setWaitingForReply] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'account' | 'security' | 'billing' | null>(null)
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light')
  const [tier, setTier] = useState('basic')
  const [toast, setToast] = useState('')
  const [passwordOld, setPasswordOld] = useState('')
  const [passwordNew, setPasswordNew] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [upgradeBusy, setUpgradeBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(current => current === message ? '' : current), 3600)
  }, [])

  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()
    return dateB - dateA
  }), [rooms])

  const filteredRooms = useMemo(() => sortedRooms.filter(room => room.name.toLowerCase().includes(search.toLowerCase().trim())), [sortedRooms, search])
  const activeRoom = rooms.find(room => room.chatroom_id === activeChatId)

  const loadRoomDetails = useCallback(async (chatroomId: string) => {
    const data = await api<ChatDetail>(\`/ChatRoom/chatroom/\${encodeURIComponent(chatroomId)}\`)
    const nextMessages = Array.isArray(data?.messages) ? data.messages : []
    if (activeChatRef.current === chatroomId) setMessages(nextMessages)
    return { ...data, messages: nextMessages }
  }, [])

  const loadRooms = useCallback(async () => {
    const data = await api<Room[]>('/ChatRoom/chatroom')
    const nextRooms = Array.isArray(data) ? data : []
    setRooms(nextRooms)
    return nextRooms
  }, [])

  useEffect(() => {
    activeChatRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    if (!token) { setIsLoading(false); return }
    let cancelled = false
    const hydrate = async () => {
      setIsLoading(true)
      try {
        const me = await api<Profile>('/user/user/me')
        if (cancelled) return
        setProfile(me)
        const results = await Promise.allSettled([
          loadRooms(),
          api<{ subscription_tier?: string }>('/subscribe/subscription/status'),
        ])
        if (cancelled) return
        if (results[1].status === 'fulfilled') setTier(results[1].value?.subscription_tier || 'basic')
        if (window.location.pathname === '/payment/success') {
          notify('Payment complete. Your subscription status has been refreshed.')
          window.history.replaceState({}, '', '/')
        } else if (window.location.pathname === '/payment/cancel') {
          notify('Checkout was cancelled. You can upgrade whenever you are ready.')
          window.history.replaceState({}, '', '/')
        }
      } catch (err) {
        if (!cancelled) {
          window.localStorage.removeItem(TOKEN_KEY)
          setToken('')
          setProfile(null)
          setRooms([])
          setMessages([])
          notify(\`Session ended: \${getError(err)}\`)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void hydrate()
    return () => { cancelled = true }
  }, [token, loadRooms, notify])

  useEffect(() => {
    if (!activeChatId || !token) {
      if (!activeChatId) setMessages([])
      return
    }
    let cancelled = false
    const fetchRoom = async () => {
      try {
        const data = await api<ChatDetail>(\`/ChatRoom/chatroom/\${encodeURIComponent(activeChatId)}\`)
        if (!cancelled && activeChatRef.current === activeChatId) setMessages(Array.isArray(data?.messages) ? data.messages : [])
      } catch (err) {
        if (!cancelled) notify(getError(err))
      }
    }
    void fetchRoom()
    return () => { cancelled = true }
  }, [activeChatId, token, notify])

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [draft])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, waitingForReply])

  useEffect(() => {
    if (activeChatId === null) textareaRef.current?.focus()
  }, [activeChatId])

  const authenticated = (nextToken: string) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setIsLoading(true)
  }

  const createRoom = async (title: string): Promise<Room> => {
    const created = await api<{ chatroom_id?: string }>('/ChatRoom/chatroom', {
      method: 'POST', body: JSON.stringify({ title: title.slice(0, 100) || 'New conversation' }),
    })
    if (!created?.chatroom_id) throw new Error('The API did not return a chatroom ID.')
    const room: Room = { chatroom_id: created.chatroom_id, name: title.slice(0, 100) || 'New conversation', created_at: new Date().toISOString() }
    setRooms(existing => [room, ...existing.filter(item => item.chatroom_id !== room.chatroom_id)])
    activeChatRef.current = room.chatroom_id
    setActiveChatId(room.chatroom_id)
    setMessages([])
    setMobileSidebarOpen(false)
    return room
  }

  const startNewChat = () => {
    activeChatRef.current = null
    setActiveChatId(null)
    setMessages([])
    setDraft('')
    setMobileSidebarOpen(false)
    setSearch('')
  }

  const selectRoom = (id: string) => {
    activeChatRef.current = id
    setActiveChatId(id)
    setMobileSidebarOpen(false)
  }

  const submitMessage = async (override?: string) => {
    const content = (override ?? draft).trim()
    if (!content || sending) return
    setDraft('')
    setSending(true)
    let chatroomId = activeChatId
    let baselineAiCount = 0
    try {
      if (!chatroomId) {
        const title = content.replace(/\s+/g, ' ').slice(0, 46) + (content.length > 46 ? '…' : '')
        const newRoom = await createRoom(title)
        chatroomId = newRoom.chatroom_id
      } else {
        try {
          const current = await api<ChatDetail>(\`/ChatRoom/chatroom/\${encodeURIComponent(chatroomId)}\`)
          baselineAiCount = (current.messages || []).filter(message => message.sender === 'ai').length
        } catch {
          baselineAiCount = messages.filter(message => message.sender === 'ai').length
        }
      }
      await api<{ message_id?: string }>(\`/message/\${encodeURIComponent(chatroomId)}/message\`, {
        method: 'POST', body: JSON.stringify({ content }),
      })
      setWaitingForReply(true)
      await loadRoomDetails(chatroomId)
      let receivedReply = false
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 1800))
        try {
          const detail = await api<ChatDetail>(\`/ChatRoom/chatroom/\${encodeURIComponent(chatroomId)}\`)
          const nextMessages = Array.isArray(detail?.messages) ? detail.messages : []
          if (activeChatRef.current === chatroomId) setMessages(nextMessages)
          const nextAiCount = nextMessages.filter(message => message.sender === 'ai').length
          if (nextAiCount > baselineAiCount) { receivedReply = true; break }
        } catch {
          // The async worker can still be processing. The next poll retries the read.
        }
      }
      if (!receivedReply) notify('Your message was sent, but the reply is taking longer than usual. Reopen the chat to refresh it.')
      void loadRooms().catch(() => undefined)
    } catch (err) {
      setDraft(content)
      notify(getError(err))
    } finally {
      setSending(false)
      setWaitingForReply(false)
      window.setTimeout(() => textareaRef.current?.focus(), 40)
    }
  }

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitMessage()
    }
  }

  const signOut = () => {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setProfile(null)
    setRooms([])
    setMessages([])
    setActiveChatId(null)
    activeChatRef.current = null
    setSettingsTab(null)
    setPasswordNew('')
    setPasswordOld('')
    notify('You have signed out.')
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (passwordNew.length < 8 || !/[A-Za-z]/.test(passwordNew) || !/\d/.test(passwordNew) || !/[!@#$%^&*()\-_=+\[\]{};:<>|./?]/.test(passwordNew)) {
      notify('Use 8+ characters with a letter, number, and special character.')
      return
    }
    setPasswordBusy(true)
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password: passwordOld, new_password: passwordNew }) })
      setPasswordOld('')
      setPasswordNew('')
      notify('Password changed successfully.')
    } catch (err) {
      notify(getError(err))
    } finally {
      setPasswordBusy(false)
    }
  }

  const upgradeToPro = async () => {
    setUpgradeBusy(true)
    try {
      const data = await api<{ checkout_url?: string }>('/subscribe/pro', { method: 'POST' })
      if (!data?.checkout_url) throw new Error('The API did not return a checkout URL.')
      window.location.assign(data.checkout_url)
    } catch (err) {
      notify(getError(err))
      setUpgradeBusy(false)
    }
  }

  const copyText = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      notify('Copied to clipboard.')
    } catch {
      notify('Clipboard access is unavailable in this browser.')
    }
  }

  if (isLoading) {
    return <main className="loading-screen"><BrandMark /><div className="loading-orbit" /><p>Opening your workspace…</p></main>
  }
  if (!token) return <AuthView onAuthenticated={authenticated} />

  return (
    <main className="app-shell">
      <div className={mobileSidebarOpen ? 'sidebar-scrim visible' : 'sidebar-scrim'} onClick={() => setMobileSidebarOpen(false)} />
      <aside className={mobileSidebarOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-head">
          <div className="brand-lockup"><BrandMark /><span>Gemini</span></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileSidebarOpen(false)}><X size={19} /></button>
          <button className="icon-button collapse-sidebar" aria-label="New chat" onClick={startNewChat}><Ellipsis size={20} /></button>
        </div>
        <button className="new-chat-button" onClick={startNewChat}><span className="new-chat-plus"><Plus size={19} /></span><span>New chat</span><kbd>⌘ K</kbd></button>
        <button className="sidebar-nav active-nav" onClick={startNewChat}><Sparkles size={17} /><span>Explore</span></button>
        <div className="history-header"><span>RECENT</span><button className="icon-button subtle-icon" aria-label="Search chats" onClick={() => document.getElementById('history-search')?.focus()}><Search size={15} /></button></div>
        <div className="history-search-wrap"><Search size={15} /><input id="history-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" /></div>
        <div className="chat-history">
          {filteredRooms.length > 0 ? filteredRooms.map(room => (
            <button key={room.chatroom_id} className={activeChatId === room.chatroom_id ? 'history-item selected' : 'history-item'} onClick={() => selectRoom(room.chatroom_id)} title={room.name}>
              <MessageCircle size={16} /><span>{room.name || 'Untitled conversation'}</span>
              {activeChatId === room.chatroom_id && <span className="history-active-dot" />}
            </button>
          )) : (
            <div className="history-empty">{search ? 'No chats match your search.' : <><History size={18} /><span>Your conversations will appear here.</span></>}</div>
          )}
        </div>
        <div className="sidebar-spacer" />
        <div className="upgrade-card">
          <div className="upgrade-icon"><Zap size={17} /></div>
          <div className="upgrade-copy"><strong>{tier.toLowerCase() === 'pro' ? 'You’re on Pro' : 'Make room for more'}</strong><span>{tier.toLowerCase() === 'pro' ? 'Enjoy unlimited messages' : 'Unlock unlimited conversations'}</span></div>
          {tier.toLowerCase() !== 'pro' && <button onClick={() => setSettingsTab('billing')} aria-label="Explore Pro"><ArrowRight size={17} /></button>}
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-nav" onClick={() => setSettingsTab('billing')}><Zap size={17} /><span>Upgrade plan</span><span className="pro-pill">PRO</span></button>
          <button className="sidebar-nav" onClick={() => setSettingsTab('account')}><Settings size={17} /><span>Settings</span></button>
          <div className="account-strip">
            <div className="avatar">{(profile?.full_name || profile?.mobile || 'G').trim().charAt(0).toUpperCase()}</div>
            <button className="account-meta" onClick={() => setSettingsTab('account')}><strong>{profile?.full_name || 'Your account'}</strong><span>{tier.toLowerCase() === 'pro' ? 'Pro plan' : 'Basic plan'}</span></button>
            <button className="icon-button account-more" aria-label="Account options" onClick={() => setSettingsTab('account')}><MoreHorizontal size={18} /></button>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileSidebarOpen(true)}><Menu size={20} /></button>
            <span className="topbar-context">{activeRoom ? 'Your conversation' : 'Your thinking space'}</span>
            {activeRoom && <><span className="context-divider">/</span><strong className="topbar-room-title">{activeRoom.name}</strong></>}
          </div>
          <div className="topbar-actions">
            <span className="workspace-status"><span className="status-dot" /> Personal workspace</span>
            <button className="icon-button theme-button" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="topbar-avatar" aria-label="Open account settings" onClick={() => setSettingsTab('account')}>{(profile?.full_name || profile?.mobile || 'G').trim().charAt(0).toUpperCase()}</button>
          </div>
        </header>

        <div className={activeChatId ? 'conversation-area has-messages' : 'conversation-area'}>
          {!activeChatId ? (
            <div className="welcome-layout">
              <div className="welcome-content">
                <div className="welcome-glyph"><BrandMark /></div>
                <p className="welcome-eyebrow">A GOOD PLACE TO BEGIN</p>
                <h1>Hi{profile?.full_name?.trim() ? \`, \${profile.full_name.trim().split(/\s+/)[0]}\` : ' there'}<span className="greeting-comma">.</span><br /><span className="gradient-text">What’s on your mind?</span></h1>
                <p className="welcome-description">Big questions, little curiosities, half-formed ideas — bring them all. We’ll figure out the next step together.</p>
                <div className="starter-grid">
                  {starterPrompts.map(prompt => {
                    const Icon = prompt.icon
                    return <button key={prompt.title} className="starter-card" onClick={() => void submitMessage(prompt.text)}>
                      <span className={\`starter-icon \${prompt.tone}\`}><Icon size={19} /></span>
                      <span className="starter-card-copy"><strong>{prompt.title}</strong><span>{prompt.text}</span></span>
                      <ArrowUpRightIcon />
                    </button>
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="message-column">
              {messages.length === 0 && !waitingForReply ? (
                <div className="empty-chat-state"><BrandMark /><h2>A clean slate.</h2><p>Ask a question, explore an idea, or just start wherever you are.</p></div>
              ) : messages.map((message, index) => (
                <article key={message.message_id || \`\${message.sender}-\${index}\`} className={message.sender === 'user' ? 'message-row user-message-row' : 'message-row ai-message-row'}>
                  {message.sender === 'user' ? (
                    <div className="user-bubble">
                      <div className="message-body">{message.content}</div>
                      <div className="message-meta"><span>{formatTime(message.created_at)}</span><CheckCheck size={14} /></div>
                    </div>
                  ) : (
                    <div className="assistant-message">
                      <div className="assistant-avatar"><BrandMark small /></div>
                      <div className="assistant-content">
                        <div className="assistant-name">Gemini <span>·</span> <time>{formatTime(message.created_at)}</time></div>
                        <div className="message-body">{message.content}</div>
                        <div className="message-tools"><button onClick={() => void copyText(message.content)}><Copy size={14} /> Copy response</button></div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
              {waitingForReply && <div className="thinking-row"><div className="assistant-avatar"><BrandMark small /></div><div><div className="thinking-title">Putting the pieces together</div><div className="thinking-dots"><span /><span /><span /></div></div></div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <footer className={activeChatId ? 'composer-area compact-composer' : 'composer-area'}>
          <form className="composer-card" onSubmit={e => { e.preventDefault(); void submitMessage() }}>
            <textarea ref={textareaRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleComposerKey} placeholder="Ask anything, or start with an idea…" rows={1} aria-label="Message Gemini" />
            <div className="composer-bottom">
              <div className="composer-hints"><span className="hint-sparkle"><Sparkles size={14} /></span><span>Curiosity looks good on you.</span><span className="hint-divider">·</span><span>Shift + Enter for a new line</span></div>
              <button className={draft.trim() && !sending ? 'send-button ready' : 'send-button'} type="submit" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <span className="spinner spinner-dark" /> : <Send size={17} />}</button>
            </div>
          </form>
          <div className="composer-disclaimer">AI can make mistakes. Check important info, and use your best judgment.</div>
        </footer>
      </section>

      {settingsTab && (
        <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsTab(null) }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header className="modal-header"><div><span className="modal-eyebrow">YOUR WORKSPACE</span><h2 id="settings-title">{settingsTab === 'account' ? 'Account settings' : settingsTab === 'security' ? 'Security & privacy' : 'Your plan'}</h2></div><button className="icon-button" onClick={() => setSettingsTab(null)} aria-label="Close settings"><X size={19} /></button></header>
            <div className="settings-tabs">
              <button className={settingsTab === 'account' ? 'settings-tab selected' : 'settings-tab'} onClick={() => setSettingsTab('account')}><UserRound size={15} /> Account</button>
              <button className={settingsTab === 'security' ? 'settings-tab selected' : 'settings-tab'} onClick={() => setSettingsTab('security')}><ShieldCheck size={15} /> Security</button>
              <button className={settingsTab === 'billing' ? 'settings-tab selected' : 'settings-tab'} onClick={() => setSettingsTab('billing')}><CreditCard size={15} /> Plan</button>
            </div>
            {settingsTab === 'account' && <div className="settings-body">
              <div className="profile-card"><div className="profile-avatar">{(profile?.full_name || profile?.mobile || 'G').trim().charAt(0).toUpperCase()}</div><div><h3>{profile?.full_name || 'Gemini user'}</h3><p>{profile?.mobile || 'Mobile number not available'}</p><span className="verified-label"><ShieldCheck size={13} /> {profile?.is_verified ? 'Mobile verified' : 'Account active'}</span></div></div>
              <div className="setting-info-row"><div><strong>Current plan</strong><span>{tier.toLowerCase() === 'pro' ? 'Unlimited AI messages' : '5 messages per day'}</span></div><span className={tier.toLowerCase() === 'pro' ? 'plan-chip pro-chip' : 'plan-chip'}>{tier.toUpperCase()}</span></div>
              <div className="setting-info-row"><div><strong>Appearance</strong><span>Choose the look that feels right.</span></div><button className="secondary-button compact" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}{theme === 'light' ? 'Dark mode' : 'Light mode'}</button></div>
              <button className="signout-button" onClick={signOut}><LogOut size={16} /> Sign out of this account</button>
            </div>}
            {settingsTab === 'security' && <div className="settings-body">
              <div className="security-intro"><span className="security-icon"><ShieldCheck size={20} /></span><div><strong>Keep your account secure</strong><p>Update your password periodically. Use a password you don’t use elsewhere.</p></div></div>
              <form className="settings-form" onSubmit={changePassword}>
                <label htmlFor="old-password">Current password</label><input id="old-password" className="text-input" type="password" autoComplete="current-password" value={passwordOld} onChange={e => setPasswordOld(e.target.value)} required />
                <label htmlFor="new-password">New password</label><input id="new-password" className="text-input" type="password" autoComplete="new-password" value={passwordNew} onChange={e => setPasswordNew(e.target.value)} required minLength={8} />
                <p className="field-hint">At least 8 characters, with a letter, a number, and a special character.</p>
                <button className="primary-button" type="submit" disabled={passwordBusy || !passwordOld || !passwordNew}>{passwordBusy ? <span className="spinner" /> : null} Update password <ArrowRight size={16} /></button>
              </form>
            </div>}
            {settingsTab === 'billing' && <div className="settings-body">
              <div className={tier.toLowerCase() === 'pro' ? 'billing-hero pro-billing' : 'billing-hero'}><div className="billing-badge"><Zap size={18} /></div><span className="billing-eyebrow">GEMINI {tier.toUpperCase()}</span><h3>{tier.toLowerCase() === 'pro' ? 'More room to think.' : 'Your ideas deserve no limits.'}</h3><p>{tier.toLowerCase() === 'pro' ? 'Your account is currently on Pro. Enjoy uninterrupted conversations.' : 'Upgrade for unlimited messages and keep the momentum going.'}</p><div className="plan-feature"><Check size={15} /> {tier.toLowerCase() === 'pro' ? 'Unlimited AI messages included' : 'Basic plan includes 5 messages per day'}</div><div className="plan-feature"><Check size={15} /> Your chat history stays in one place</div>{tier.toLowerCase() !== 'pro' && <button className="primary-button full-button" onClick={() => void upgradeToPro()} disabled={upgradeBusy}>{upgradeBusy ? <span className="spinner" /> : <Zap size={16} />} Continue to secure checkout <ArrowRight size={16} /></button>}</div>
              <p className="billing-footnote"><ShieldCheck size={14} /> Payments are securely handled by Stripe. Subscription status refreshes after the payment webhook completes.</p>
            </div>}
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status"><span className="toast-dot" />{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </main>
  )
}

function ArrowUpRightIcon() {
  return <span className="starter-arrow"><ArrowDown size={15} /></span>
}

export default App
