export default function CompanyLogo({ className = '', dark = false, iconSize = 'h-12', iconOnly = false }) {
  return (
    <div className={`flex items-center ${iconOnly ? 'justify-center' : 'gap-3'} ${className}`}>
      <img 
        src="/images/logo.png" 
        alt="CV. Nara Teknindotama Logo" 
        className={`${iconSize} object-contain ${dark ? 'brightness-0 invert' : ''}`} 
      />
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <span 
            className={`leading-none tracking-tighter ${dark ? 'text-white' : 'text-blue-950'} text-3xl`} 
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            NARA
          </span>
          <span 
            className={`font-bold leading-none tracking-[0.25em] ${dark ? 'text-gray-400' : 'text-blue-600'} text-[10px] mt-1`} 
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            TEKNINDOTAMA
          </span>
        </div>
      )}
    </div>
  );
}
