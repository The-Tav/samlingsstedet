import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Globe, Lock, Check, X, Users, MessageSquare, Calendar, Rss, ExternalLink, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import { compressImage } from '../lib/compressImage'

const FANER = [
  { id: 'feed', label: 'Feed', ikon: Rss },
  { id: 'arrangementer', label: 'Arrangementer', ikon: Calendar },
  { id: 'chat', label: 'Chat', ikon: MessageSquare },
  { id: 'medlemmer', label: 'Medlemmer', ikon: Users },
]

export default function GruppeDetaljer() {
  const { id } = useParams()
  const { user } = useAuth()
  const { åbnGruppeChat } = useChat()
  const navigate = useNavigate()

  const [gruppe, setGruppe] = useState(null)
  const [minRolle, setMinRolle] = useState(null) // 'admin' | 'member' | null
  const [aktivFane, setAktivFane] = useState('feed')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hentGruppe()
  }, [id])

  async function hentGruppe() {
    const { data: gruppeData, error } = await supabase
      .from('ss_groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gruppeData) { navigate('/'); return }

    const { data: medlemskab } = await supabase
      .from('ss_group_members')
      .select('role, status')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single()

    if (!medlemskab || medlemskab.status !== 'approved') {
      navigate('/')
      return
    }

    setGruppe(gruppeData)
    setMinRolle(medlemskab.role)
    setLoading(false)
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-gray-400">Indlæser gruppe...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        {/* Gruppe-header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{gruppe.name}</h2>
            {gruppe.is_public
              ? <Globe size={15} className="text-gray-400" />
              : <Lock size={15} className="text-gray-400" />}
            {minRolle === 'admin' && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Admin</span>
            )}
            <button
              onClick={() => åbnGruppeChat(id, gruppe.name)}
              title="Åbn chat som flydende vindue"
              className="hidden md:flex items-center gap-1.5 ml-auto text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Pop-out chat</span>
            </button>
          </div>
          {gruppe.description && (
            <p className="text-sm text-gray-500">{gruppe.description}</p>
          )}
        </div>

        {/* Fane-navigation */}
        <div className="flex border-b border-gray-200 mb-6 gap-1 overflow-x-auto scrollbar-none">
          {FANER.map(({ id: faneId, label, ikon: Ikon }) => (
            <button
              key={faneId}
              onClick={() => setAktivFane(faneId)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aktivFane === faneId
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Ikon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Fane-indhold */}
        {aktivFane === 'feed' && <FeedFane gruppeId={id} erAdmin={minRolle === 'admin'} />}
        {aktivFane === 'arrangementer' && <ArrangementFane gruppeId={id} />}
        {aktivFane === 'chat' && <ChatFane gruppeId={id} />}
        {aktivFane === 'medlemmer' && (
          <MedlemmerFane gruppeId={id} erAdmin={minRolle === 'admin'} />
        )}
      </div>
    </Layout>
  )
}

function FeedFane({ gruppeId, erAdmin }) {
  const { user } = useAuth()
  const [opslag, setOpslag] = useState([])
  const [nytIndhold, setNytIndhold] = useState('')
  const [valgteFiler, setValgteFiler] = useState([]) // [{ file, previewUrl }]
  const [sender, setSender] = useState(false)
  const [loading, setLoading] = useState(true)
  const filInputRef = useRef(null)

  useEffect(() => {
    hentOpslag()
    return () => valgteFiler.forEach((f) => URL.revokeObjectURL(f.previewUrl))
  }, [gruppeId])

  async function hentOpslag() {
    const { data } = await supabase
      .from('ss_posts')
      .select('id, content, image_urls, created_at, updated_at, author_id, ss_profiles!author_id(full_name, avatar_url)')
      .eq('group_id', gruppeId)
      .order('created_at', { ascending: false })

    setOpslag(data ?? [])
    setLoading(false)
  }

  function vælgFiler(e) {
    const filer = Array.from(e.target.files).slice(0, 4 - valgteFiler.length)
    const nye = filer.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setValgteFiler((prev) => [...prev, ...nye].slice(0, 4))
    e.target.value = ''
  }

  function fjernBillede(idx) {
    setValgteFiler((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function delOpslag(e) {
    e.preventDefault()
    if (!nytIndhold.trim() && valgteFiler.length === 0) return
    setSender(true)

    // Upload og komprimer billeder
    const imageUrls = []
    for (const { file } of valgteFiler) {
      try {
        const komprimeret = await compressImage(file)
        const path = `${user.id}/${Date.now()}_${komprimeret.name}`
        const { data, error } = await supabase.storage.from('opslag').upload(path, komprimeret)
        if (!error) {
          const { data: urlData } = supabase.storage.from('opslag').getPublicUrl(data.path)
          imageUrls.push(urlData.publicUrl)
        }
      } catch (_) { /* spring over ved fejl */ }
    }

    const { error } = await supabase
      .from('ss_posts')
      .insert({
        group_id: gruppeId,
        author_id: user.id,
        content: nytIndhold.trim(),
        image_urls: imageUrls,
      })

    if (!error) {
      setNytIndhold('')
      valgteFiler.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      setValgteFiler([])
      await hentOpslag()
    }
    setSender(false)
  }

  return (
    <div className="space-y-4">
      {/* Opret opslag */}
      <form onSubmit={delOpslag} className="bg-white border border-gray-200 rounded-xl p-4">
        <textarea
          value={nytIndhold}
          onChange={(e) => setNytIndhold(e.target.value)}
          placeholder="Skriv et opslag..."
          rows={3}
          className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none"
        />

        {/* Billedforhåndsvisning */}
        {valgteFiler.length > 0 && (
          <div className={`mt-3 grid gap-2 ${valgteFiler.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {valgteFiler.map(({ previewUrl }, idx) => (
              <div key={idx} className="relative">
                <img src={previewUrl} className="w-full h-32 object-cover rounded-lg" alt="" />
                <button
                  type="button"
                  onClick={() => fjernBillede(idx)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            {valgteFiler.length < 4 && (
              <>
                <input
                  ref={filInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={vælgFiler}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => filInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <ImageIcon size={16} />
                  <span>Billede</span>
                  {valgteFiler.length > 0 && (
                    <span className="text-xs text-gray-400">({valgteFiler.length}/4)</span>
                  )}
                </button>
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={(!nytIndhold.trim() && valgteFiler.length === 0) || sender}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {sender ? 'Deler...' : 'Del opslag'}
          </button>
        </div>
      </form>

      {/* Opslags-liste */}
      {loading ? (
        <p className="text-sm text-gray-400">Indlæser opslag...</p>
      ) : opslag.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-10">
          Ingen opslag endnu. Vær den første til at skrive noget!
        </div>
      ) : (
        <div className="space-y-3">
          {opslag.map((o) => (
            <OpslagKort
              key={o.id}
              opslag={o}
              erForfatter={o.author_id === user.id}
              erAdmin={erAdmin}
              onOpdateret={hentOpslag}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OpslagKort({ opslag: o, erForfatter, erAdmin, onOpdateret }) {
  const [redigerer, setRedigerer] = useState(false)
  const [redigeretIndhold, setRedigeretIndhold] = useState(o.content)
  const [gemmer, setGemmer] = useState(false)
  const [sletter, setSletter] = useState(false)
  const [bekræftSlet, setBekræftSlet] = useState(false)

  const erRedigeret = o.updated_at && new Date(o.updated_at) - new Date(o.created_at) > 2000

  async function gemRedigering() {
    if (!redigeretIndhold.trim()) return
    setGemmer(true)
    await supabase
      .from('ss_posts')
      .update({ content: redigeretIndhold.trim(), updated_at: new Date().toISOString() })
      .eq('id', o.id)
    setGemmer(false)
    setRedigerer(false)
    onOpdateret()
  }

  async function sletOpslag() {
    setSletter(true)
    // Slet tilhørende billeder fra storage
    if (o.image_urls?.length) {
      const paths = o.image_urls
        .map((url) => url.split('/opslag/')[1])
        .filter(Boolean)
      if (paths.length) await supabase.storage.from('opslag').remove(paths)
    }
    await supabase.from('ss_posts').delete().eq('id', o.id)
    onOpdateret()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <Link to={`/bruger/${o.author_id}`}>
          <Avatar name={o.ss_profiles?.full_name} avatarUrl={o.ss_profiles?.avatar_url} className="w-7 h-7" />
        </Link>
        <Link to={`/bruger/${o.author_id}`} className="text-sm font-medium text-gray-800 hover:underline">
          {o.ss_profiles?.full_name}
        </Link>
        <div className="flex items-center gap-1.5 ml-auto">
          {erRedigeret && <span className="text-xs text-gray-300 italic">redigeret</span>}
          <span className="text-xs text-gray-400">
            {new Date(o.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {(erForfatter || erAdmin) && !redigerer && (
            <>
              {erForfatter && (
                <button
                  onClick={() => { setRedigerer(true); setRedigeretIndhold(o.content) }}
                  className="p-1 text-gray-300 hover:text-indigo-500 transition-colors"
                  title="Rediger opslag"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                onClick={() => setBekræftSlet(true)}
                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                title="Slet opslag"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Indhold */}
      {redigerer ? (
        <div>
          <textarea
            value={redigeretIndhold}
            onChange={(e) => setRedigeretIndhold(e.target.value)}
            rows={3}
            autoFocus
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2 resize-none outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setRedigerer(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Annuller
            </button>
            <button
              onClick={gemRedigering}
              disabled={gemmer || !redigeretIndhold.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {gemmer ? 'Gemmer...' : 'Gem'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {o.content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.content}</p>}
          {o.image_urls?.length > 0 && (
            <div className={`mt-3 grid gap-2 ${o.image_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {o.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} className="w-full rounded-lg object-cover max-h-80" alt="" />
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bekræft sletning */}
      {bekræftSlet && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700">Vil du slette dette opslag?</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setBekræftSlet(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
            >
              Annuller
            </button>
            <button
              onClick={sletOpslag}
              disabled={sletter}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm px-3 py-1 rounded transition-colors"
            >
              {sletter ? 'Sletter...' : 'Slet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ArrangementFane({ gruppeId }) {
  const { user } = useAuth()
  const [arrangementer, setArrangementer] = useState([])
  const [mineTilmeldinger, setMineTilmeldinger] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [visForm, setVisForm] = useState(false)
  const [sender, setSender] = useState(null) // event_id under behandling

  // Formfelter
  const [titel, setTitel] = useState('')
  const [beskrivelse, setBeskrivelse] = useState('')
  const [starterDato, setStarterDato] = useState('')
  const [starterTid, setStarterTid] = useState('')
  const [slutterDato, setSlutterDato] = useState('')
  const [slutterTid, setSlutterTid] = useState('')
  const [gemmer, setGemmer] = useState(false)

  useEffect(() => {
    hentArrangementer()
  }, [gruppeId])

  async function hentArrangementer() {
    const { data: eventsData } = await supabase
      .from('ss_events')
      .select('*, ss_event_participants(count)')
      .eq('group_id', gruppeId)
      .order('starts_at', { ascending: true })

    const events = eventsData ?? []
    setArrangementer(events)

    if (events.length > 0) {
      const { data: deltagelser } = await supabase
        .from('ss_event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', events.map((e) => e.id))

      setMineTilmeldinger(new Set(deltagelser?.map((d) => d.event_id) ?? []))
    }

    setLoading(false)
  }

  async function opretArrangement(e) {
    e.preventDefault()
    setGemmer(true)

    const startsAt = new Date(`${starterDato}T${starterTid}`).toISOString()
    const endsAt = slutterDato && slutterTid
      ? new Date(`${slutterDato}T${slutterTid}`).toISOString()
      : null

    const { error } = await supabase
      .from('ss_events')
      .insert({
        group_id: gruppeId,
        created_by: user.id,
        title: titel.trim(),
        description: beskrivelse.trim(),
        starts_at: startsAt,
        ...(endsAt ? { ends_at: endsAt } : {}),
      })

    if (!error) {
      setTitel(''); setBeskrivelse('')
      setStarterDato(''); setStarterTid('')
      setSlutterDato(''); setSlutterTid('')
      setVisForm(false)
      await hentArrangementer()
    }
    setGemmer(false)
  }

  async function togglDeltagelse(eventId) {
    setSender(eventId)
    const deltager = mineTilmeldinger.has(eventId)

    if (deltager) {
      await supabase
        .from('ss_event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('ss_event_participants')
        .insert({ event_id: eventId, user_id: user.id })
    }

    await hentArrangementer()
    setSender(null)
  }

  function formatDato(iso) {
    return new Date(iso).toLocaleString('da-DK', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return <p className="text-sm text-gray-400">Indlæser arrangementer...</p>

  return (
    <div className="space-y-4">
      {/* Opret-knap */}
      <div className="flex justify-end">
        <button
          onClick={() => setVisForm((v) => !v)}
          className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {visForm ? 'Luk' : '+ Nyt arrangement'}
        </button>
      </div>

      {/* Opret-formular */}
      {visForm && (
        <form onSubmit={opretArrangement} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
            <input
              type="text"
              required
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Hvad skal der ske?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              rows={2}
              placeholder="Fortæl mere om arrangementet..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Startdato</label>
              <input
                type="date"
                required
                value={starterDato}
                onChange={(e) => setStarterDato(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Starttidspunkt</label>
              <input
                type="time"
                required
                value={starterTid}
                onChange={(e) => setStarterTid(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slutdato <span className="text-gray-400 font-normal">(valgfri)</span></label>
              <input
                type="date"
                value={slutterDato}
                onChange={(e) => setSlutterDato(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sluttidspunkt <span className="text-gray-400 font-normal">(valgfri)</span></label>
              <input
                type="time"
                value={slutterTid}
                onChange={(e) => setSlutterTid(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setVisForm(false)}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={gemmer}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {gemmer ? 'Gemmer...' : 'Opret arrangement'}
            </button>
          </div>
        </form>
      )}

      {/* Arrangement-liste */}
      {arrangementer.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-10">
          Ingen arrangementer endnu. Vær den første til at oprette et!
        </div>
      ) : (
        <div className="space-y-3">
          {arrangementer.map((a) => {
            const deltager = mineTilmeldinger.has(a.id)
            const antal = a.ss_event_participants?.[0]?.count ?? 0
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                    <p className="text-xs text-indigo-600 mt-0.5">{formatDato(a.starts_at)}{a.ends_at ? ` – ${formatDato(a.ends_at)}` : ''}</p>
                    {a.description && (
                      <p className="text-sm text-gray-600 mt-1.5">{a.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{antal} {antal === 1 ? 'deltager' : 'deltagere'}</p>
                  </div>
                  <button
                    onClick={() => togglDeltagelse(a.id)}
                    disabled={sender === a.id}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      deltager
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sender === a.id ? '...' : deltager ? 'Afmeld' : 'Deltag'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChatFane({ gruppeId }) {
  const { user } = useAuth()
  const [beskeder, setBeskeder] = useState([])
  const [loading, setLoading] = useState(true)
  const [nytIndhold, setNytIndhold] = useState('')
  const [sender, setSender] = useState(false)
  const bundenRef = useRef(null)

  useEffect(() => {
    hentBeskeder()

    // Realtime-abonnement på nye beskeder i denne gruppe
    const kanal = supabase
      .channel(`gruppe-chat-${gruppeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ss_messages', filter: `group_id=eq.${gruppeId}` },
        async (payload) => {
          // Hent den nye besked med forfatternavn
          const { data } = await supabase
            .from('ss_messages')
            .select('id, content, created_at, author_id, ss_profiles!author_id(full_name)')
            .eq('id', payload.new.id)
            .single()
          if (data) setBeskeder((prev) => [...prev, data])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(kanal)
  }, [gruppeId])

  // Auto-scroll til bunden når beskeder opdateres
  useEffect(() => {
    bundenRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [beskeder])

  async function hentBeskeder() {
    const { data } = await supabase
      .from('ss_messages')
      .select('id, content, created_at, author_id, ss_profiles!author_id(full_name, avatar_url)')
      .eq('group_id', gruppeId)
      .order('created_at', { ascending: true })
      .limit(100)

    setBeskeder(data ?? [])
    setLoading(false)
  }

  async function sendBesked(e) {
    e.preventDefault()
    if (!nytIndhold.trim() || sender) return
    setSender(true)
    const tekst = nytIndhold.trim()
    setNytIndhold('')

    await supabase
      .from('ss_messages')
      .insert({ group_id: gruppeId, author_id: user.id, content: tekst })

    setSender(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendBesked(e)
    }
  }

  function formatTid(iso) {
    return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <p className="text-sm text-gray-400">Indlæser chat...</p>

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '360px' }}>
      {/* Beskedliste */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-2">
        {beskeder.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Ingen beskeder endnu. Vær den første til at skrive!</p>
          </div>
        ) : (
          <>
            {beskeder.map((b, i) => {
              const erMig = b.author_id === user.id
              const forrige = beskeder[i - 1]
              const sammeAfsender = forrige?.author_id === b.author_id
              return (
                <div key={b.id} className={`flex items-end gap-2 ${erMig ? 'flex-row-reverse' : ''} ${sammeAfsender ? 'mt-0.5' : 'mt-3'}`}>
                  {/* Avatar — vis kun ved første besked i en række */}
                  {!erMig && (
                    <div className={sammeAfsender ? 'invisible w-7 h-7 shrink-0' : ''}>
                      <Avatar name={b.ss_profiles?.full_name} avatarUrl={b.ss_profiles?.avatar_url} className="w-7 h-7" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${erMig ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* Navn + tid — kun ved første besked i en række */}
                    {!sammeAfsender && (
                      <span className={`text-xs text-gray-400 mb-0.5 ${erMig ? 'text-right' : ''}`}>
                        {erMig ? 'Dig' : b.ss_profiles?.full_name} · {formatTid(b.created_at)}
                      </span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      erMig
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}>
                      {b.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bundenRef} />
          </>
        )}
      </div>

      {/* Besked-input */}
      <form onSubmit={sendBesked} className="flex items-end gap-2 pt-3 border-t border-gray-200 mt-2">
        <textarea
          value={nytIndhold}
          onChange={(e) => setNytIndhold(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Skriv en besked… (Enter for at sende)"
          rows={1}
          className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={!nytIndhold.trim() || sender}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-90">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function MedlemmerFane({ gruppeId, erAdmin }) {
  const [medlemmer, setMedlemmer] = useState([])
  const [ventende, setVentende] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hentMedlemmer()
  }, [gruppeId])

  async function hentMedlemmer() {
    const { data } = await supabase
      .from('ss_group_members')
      .select('id, role, status, user_id, ss_profiles(full_name, avatar_url)')
      .eq('group_id', gruppeId)
      .order('created_at', { ascending: true })

    const godkendte = data?.filter((m) => m.status === 'approved') ?? []
    const afventende = data?.filter((m) => m.status === 'pending') ?? []
    setMedlemmer(godkendte)
    setVentende(afventende)
    setLoading(false)
  }

  async function behandlAnsøgning(medlemId, godkend) {
    await supabase
      .from('ss_group_members')
      .update({ status: godkend ? 'approved' : 'rejected' })
      .eq('id', medlemId)
    hentMedlemmer()
  }

  if (loading) return <p className="text-sm text-gray-400">Indlæser medlemmer...</p>

  return (
    <div className="space-y-6">
      {/* Ventende ansøgninger — kun synlig for admin */}
      {erAdmin && ventende.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Ansøgninger ({ventende.length})
          </h3>
          <div className="space-y-2">
            {ventende.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
              >
                <Link to={`/bruger/${m.user_id}`}><Avatar name={m.ss_profiles?.full_name} avatarUrl={m.ss_profiles?.avatar_url} className="w-8 h-8" /></Link>
                <Link to={`/bruger/${m.user_id}`} className="flex-1 text-sm text-gray-800 hover:underline">{m.ss_profiles?.full_name}</Link>
                <button
                  onClick={() => behandlAnsøgning(m.id, true)}
                  className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  title="Godkend"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => behandlAnsøgning(m.id, false)}
                  className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  title="Afvis"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Godkendte medlemmer */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Medlemmer ({medlemmer.length})
        </h3>
        <div className="space-y-2">
          {medlemmer.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
            >
              <Link to={`/bruger/${m.user_id}`}><Avatar name={m.ss_profiles?.full_name} avatarUrl={m.ss_profiles?.avatar_url} className="w-8 h-8" /></Link>
              <Link to={`/bruger/${m.user_id}`} className="flex-1 text-sm text-gray-800 hover:underline">{m.ss_profiles?.full_name}</Link>
              {m.role === 'admin' && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
