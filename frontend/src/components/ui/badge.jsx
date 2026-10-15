import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  // Map 'danger' to 'destructive' for backward compatibility
  const normalizedVariant = variant === 'danger' ? 'destructive' : variant;
  
  const variants = {
    default: "border-transparent bg-primary-600 text-white hover:bg-primary-700",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    outline: "text-slate-950",
    success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
    warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2",
        variants[normalizedVariant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
