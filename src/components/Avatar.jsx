// Genbrugelig avatar-komponent.
// Viser profilbillede hvis avatar_url er sat, ellers initial-bogstav.
// className styrer størrelse og eventuelle ekstra klasser.
export default function Avatar({ name, avatarUrl, className = 'w-8 h-8', tekstKlasse = 'text-xs' }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        className={`${className} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${className} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center ${tekstKlasse} font-bold shrink-0 select-none`}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
