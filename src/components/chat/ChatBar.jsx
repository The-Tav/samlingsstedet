import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import Avatar from '../Avatar'
import ChatVindue from './ChatVindue'
import VennerPanel from './VennerPanel'
import { useChat } from '../../contexts/ChatContext'

export default function ChatBar() {
  const { vinduer, togglMinimer, antalVentende, antalUlæste } = useChat()
  const [visPanel, setVisPanel] = useState(false)

  const åbne      = vinduer.filter((v) => !v.minimeret)
  const minimerede = vinduer.filter((v) => v.minimeret)

  return (
    <>
      {/* Flydende chatvinduer */}
      {åbne.map((v, i) => (
        <ChatVindue key={`${v.type}-${v.id}`} vindue={v} position={i + 1} />
      ))}

      {/* ChatBar — fast i bunden til højre */}
      <div className="hidden md:flex fixed bottom-0 right-4 z-40 items-end gap-2 pb-0">
        {/* Minimerede vinduer */}
        {minimerede.map((v) => (
          <button
            key={`${v.type}-${v.id}`}
            onClick={() => togglMinimer(v.id)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-t-xl px-3 py-2 shadow-lg hover:bg-gray-50 transition-colors max-w-[160px]"
          >
            {v.type === 'gruppe' ? (
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {v.navn[0]?.toUpperCase()}
              </div>
            ) : (
              <Avatar name={v.navn} avatarUrl={v.avatarUrl} className="w-6 h-6 shrink-0" />
            )}
            <span className="text-xs font-medium text-gray-700 truncate">{v.navn}</span>
          </button>
        ))}

        {/* Chat-ikon med VennerPanel */}
        <div className="relative">
          {visPanel && <VennerPanel onLuk={() => setVisPanel(false)} />}
          <button
            onClick={() => setVisPanel((v) => !v)}
            className="flex items-center justify-center w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-t-xl shadow-lg transition-colors relative"
            title="Chat"
          >
            <MessageCircle size={20} />
            {(antalVentende + antalUlæste) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {Math.min(antalVentende + antalUlæste, 9)}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
