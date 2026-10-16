export default function CompanyLogo({ className = '', dark = false, iconSize = 'h-12', iconOnly = false, collapsed = false }) {
  return (
    <div className={`flex items-center shrink-0 ${iconOnly || collapsed ? 'justify-center' : 'gap-3'} ${className}`}>
      <img 
        src="/images/logo.png" 
        alt="CV. Nara Teknindotama Logo" 
        className={`${iconSize} object-contain shrink-0 transition-transform duration-300 ${dark ? 'brightness-0 invert' : ''}`} 
      />
      {!iconOnly && (
        <div className={`flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[200px] opacity-100'}`}>
          <span 
            className={`leading-none tracking-tighter ${dark ? 'text-white' : 'text-blue-950'} text-3xl`} 
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            NARA
          </span>
          <span 
            className={`font-bold leading-none tracking-[0.25em] ${dark ? 'text-slate-500' : 'text-blue-600'} text-xs mt-1`} 
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            TEKNINDOTAMA
          </span>
        </div>
      )}
    </div>
  );
}
