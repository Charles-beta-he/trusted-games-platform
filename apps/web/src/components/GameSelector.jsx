import { getAllGames } from '../plugins/index.js'

const games = getAllGames()

export default function GameSelector({ currentGameId = 'gomoku' }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[3px] uppercase text-ink-faint pb-2 border-b border-paper-dark mb-3">
        游戏选择
      </div>
      <div className="flex flex-col gap-1">
        {games.map((game) => {
          const isActive = game.id === currentGameId
          const isInstalled = game.status === 'installed'
          return (
            <div
              key={game.id}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 border transition-all
                ${isActive
                  ? 'border-ink bg-ink text-paper'
                  : isInstalled
                    ? 'border-paper-dark text-ink-faint hover:border-ink-faint hover:text-ink cursor-pointer'
                    : 'border-paper-dark text-ink-faint/40 cursor-not-allowed'}
              `}
            >
              <span className="text-base flex-shrink-0">{game.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] font-semibold tracking-wide truncate">{game.name}</div>
                {!isInstalled && (
                  <div className="font-mono text-[9px] opacity-60 tracking-wide">COMING SOON</div>
                )}
              </div>
              {isInstalled && (
                <div className="w-1.5 h-1.5 rounded-full bg-trust-l1 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
