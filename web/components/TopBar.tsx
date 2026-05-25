interface TopBarProps {
  title: string
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
      <span className="text-lg font-semibold text-gray-900">{title}</span>
      <div className="ml-auto flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
          CRM
        </div>
      </div>
    </div>
  )
}
