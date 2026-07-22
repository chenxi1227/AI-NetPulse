export default function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex gap-1">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}
