import {
  FileText, MessageSquare, Sliders, Target, FolderOpen, Map, Wand2, Linkedin,
} from 'lucide-react'

export interface ToolTile {
  to: string
  label: string
  description: string
  icon: typeof FileText
}

export const TOOL_TILES: ToolTile[] = [
  { to: '/onboarding', label: 'Career Wizard', description: 'Revisit or update your onboarding questionnaire.', icon: Wand2 },
  { to: '/profile', label: 'Resume Builder', description: 'Manage your resume and career documents.', icon: FileText },
  { to: '/mock-interviews', label: 'Interview Prep', description: 'Practice sessions and interview coaching.', icon: MessageSquare },
  { to: '/linkedin-optimizer', label: 'LinkedIn Optimizer', description: 'Score your LinkedIn profile and get rewrite suggestions.', icon: Linkedin },
  { to: '/profile', label: 'Job Preferences', description: 'Set your target roles, salary range, and location.', icon: Sliders },
  { to: '/applications', label: 'Why We Applied', description: 'See the reasoning behind each submitted application.', icon: Target },
  { to: '/profile', label: 'Documents', description: 'Upload and organize resumes, cover letters, and files.', icon: FolderOpen },
  { to: '/roadmap', label: 'Career Roadmap', description: 'Your long-term career plan with your strategist.', icon: Map },
]
