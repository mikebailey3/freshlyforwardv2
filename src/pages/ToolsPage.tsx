import { Link } from 'react-router-dom'
import { MemberLayout } from '@/components/MemberLayout'
import { TOOL_TILES } from '@/data/tools'
import { Sparkles } from 'lucide-react'

export function ToolsPage() {
  return (
    <MemberLayout>
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Tools</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Everything you need to plan, prep, and manage your job search in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_TILES.map((tool) => (
          <Link
            key={tool.label}
            to={tool.to}
            className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md hover:border-primary-200"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <tool.icon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-neutral-900">{tool.label}</h3>
              <p className="mt-1 text-xs text-neutral-600">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </MemberLayout>
  )
}
