export interface QuestionnaireField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date' | 'tags' | 'employment' | 'education' | 'certifications'
  placeholder?: string
  options?: string[]
  required?: boolean
  helpText?: string
  min?: number
  max?: number
}

export interface QuestionnaireSection {
  key: string
  title: string
  description: string
  icon: string
  fields: QuestionnaireField[]
}

export const questionnaireSections: QuestionnaireSection[] = [
  {
    key: 'personal_info',
    title: 'Personal Information',
    description: 'Basic contact details so your Career Strategist can reach you.',
    icon: 'User',
    fields: [
      { key: 'full_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Jane Doe' },
      { key: 'phone', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567' },
      { key: 'location', label: 'Current Location', type: 'text', required: true, placeholder: 'Austin, TX', helpText: 'City and state is sufficient.' },
      { key: 'linkedin_url', label: 'LinkedIn Profile URL', type: 'text', placeholder: 'https://linkedin.com/in/yourname' },
      { key: 'portfolio_url', label: 'Portfolio or Personal Website', type: 'text', placeholder: 'https://yourname.com' },
    ],
  },
  {
    key: 'employment_history',
    title: 'Employment History',
    description: 'Tell us about your work experience. Add as many roles as you like.',
    icon: 'Briefcase',
    fields: [
      { key: 'employment_history', label: 'Employment History', type: 'employment', required: true },
    ],
  },
  {
    key: 'education',
    title: 'Education',
    description: 'Your educational background helps us understand your qualifications.',
    icon: 'GraduationCap',
    fields: [
      { key: 'education', label: 'Education', type: 'education' },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    description: 'List your professional skills. These help your Strategist identify the right opportunities.',
    icon: 'Wrench',
    fields: [
      { key: 'skills', label: 'Skills', type: 'tags', required: true, placeholder: 'Type a skill and press Enter', helpText: 'Add skills one at a time — e.g., Project Management, Python, Leadership.' },
    ],
  },
  {
    key: 'certifications',
    title: 'Certifications',
    description: 'Professional certifications and licenses you hold.',
    icon: 'Award',
    fields: [
      { key: 'certifications', label: 'Certifications', type: 'certifications' },
    ],
  },
  {
    key: 'preferred_jobs',
    title: 'Preferred Jobs',
    description: 'What job titles are you targeting? Be as specific as you like.',
    icon: 'Target',
    fields: [
      { key: 'preferred_jobs', label: 'Preferred Job Titles', type: 'tags', required: true, placeholder: 'Type a job title and press Enter', helpText: 'Add one at a time — e.g., Product Manager, Data Analyst.' },
    ],
  },
  {
    key: 'jobs_to_avoid',
    title: 'Jobs to Avoid',
    description: 'Roles or titles you are not interested in pursuing.',
    icon: 'Ban',
    fields: [
      { key: 'jobs_to_avoid', label: 'Jobs to Avoid', type: 'tags', placeholder: 'Type a job title and press Enter' },
    ],
  },
  {
    key: 'industries',
    title: 'Industries',
    description: 'Which industries interest you most?',
    icon: 'Building2',
    fields: [
      { key: 'preferred_industries', label: 'Preferred Industries', type: 'multiselect', required: true, options: [
        'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail',
        'Consulting', 'Media', 'Real Estate', 'Government', 'Non-Profit', 'Energy',
        'Transportation', 'Hospitality', 'Legal', 'Marketing', 'Insurance', 'Telecommunications',
      ]},
    ],
  },
  {
    key: 'salary_expectations',
    title: 'Salary Expectations',
    description: 'Your target compensation range helps us filter opportunities.',
    icon: 'DollarSign',
    fields: [
      { key: 'salary_min', label: 'Minimum Salary (USD/year)', type: 'number', required: true, placeholder: '60000', min: 0 },
      { key: 'salary_max', label: 'Maximum Salary (USD/year)', type: 'number', placeholder: '120000', min: 0 },
    ],
  },
  {
    key: 'benefits',
    title: 'Benefits',
    description: 'Which benefits matter most to you?',
    icon: 'Heart',
    fields: [
      { key: 'preferred_benefits', label: 'Preferred Benefits', type: 'multiselect', options: [
        'Health Insurance', 'Dental Insurance', 'Vision Insurance', '401(k) Matching',
        'Paid Time Off', 'Flexible Schedule', 'Remote Work', 'Hybrid Work',
        'Tuition Reimbursement', 'Professional Development', 'Gym Membership',
        'Life Insurance', 'Disability Insurance', 'Parental Leave', 'Stock Options',
        'Performance Bonuses', 'Relocation Assistance', 'Commuter Benefits',
      ]},
    ],
  },
  {
    key: 'schedule',
    title: 'Schedule',
    description: 'Your preferred work schedule.',
    icon: 'Clock',
    fields: [
      { key: 'schedule_preference', label: 'Preferred Schedule', type: 'select', options: [
        'Standard (9am-5pm)', 'Early Morning', 'Evening', 'Flexible Hours',
        '4-Day Work Week', 'Weekend Availability', 'Open to Any Schedule',
      ]},
    ],
  },
  {
    key: 'commute',
    title: 'Commute',
    description: 'How far are you willing to commute?',
    icon: 'Car',
    fields: [
      { key: 'max_commute_minutes', label: 'Maximum Commute (minutes one way)', type: 'number', placeholder: '30', min: 0, max: 180 },
    ],
  },
  {
    key: 'remote_preference',
    title: 'Remote Preference',
    description: 'Where do you want to work?',
    icon: 'Home',
    fields: [
      { key: 'remote_preference', label: 'Remote Preference', type: 'select', required: true, options: [
        'Fully Remote', 'Hybrid (2-3 days remote)', 'On-Site Only', 'Open to Any',
      ]},
    ],
  },
  {
    key: 'relocation',
    title: 'Relocation',
    description: 'Are you open to relocating for the right opportunity?',
    icon: 'MapPin',
    fields: [
      { key: 'willing_to_relocate', label: 'Willing to Relocate', type: 'boolean' },
    ],
  },
  {
    key: 'travel',
    title: 'Travel',
    description: 'How much travel are you comfortable with?',
    icon: 'Plane',
    fields: [
      { key: 'travel_willingness', label: 'Travel Willingness', type: 'select', options: [
        'No Travel', 'Occasional (1-2 days/month)', 'Regular (1-2 days/week)',
        'Frequent (3+ days/week)', 'Up to 50% Travel', 'Up to 100% Travel',
      ]},
    ],
  },
  {
    key: 'work_style',
    title: 'Work Style',
    description: 'How do you work best?',
    icon: 'Users',
    fields: [
      { key: 'work_style', label: 'Preferred Work Style', type: 'select', options: [
        'Independent', 'Collaborative Team', 'Mix of Both', 'Leading a Team',
        'Cross-Functional', 'Client-Facing', 'Behind the Scenes',
      ]},
    ],
  },
  {
    key: 'career_goals',
    title: 'Career Goals',
    description: 'What are you working toward in your career?',
    icon: 'TrendingUp',
    fields: [
      { key: 'career_goals', label: 'Career Goals', type: 'textarea', required: true, placeholder: 'I want to move into a senior leadership role within the next 2 years…', helpText: 'Think about where you want to be in 1, 3, and 5 years.' },
    ],
  },
  {
    key: 'strengths',
    title: 'Strengths',
    description: 'What do you do better than most people?',
    icon: 'Zap',
    fields: [
      { key: 'strengths', label: 'Your Strengths', type: 'textarea', placeholder: 'I excel at building relationships, analyzing data, and communicating complex ideas…' },
    ],
  },
  {
    key: 'weaknesses',
    title: 'Areas for Growth',
    description: 'What are you working to improve?',
    icon: 'AlertTriangle',
    fields: [
      { key: 'weaknesses', label: 'Areas for Growth', type: 'textarea', placeholder: 'I am working on my public speaking and delegation skills…' },
    ],
  },
  {
    key: 'jobs_enjoyed',
    title: 'Jobs You Enjoyed',
    description: 'Which past roles did you enjoy most, and why?',
    icon: 'Smile',
    fields: [
      { key: 'jobs_enjoyed', label: 'Jobs You Enjoyed', type: 'textarea', placeholder: 'I loved my role as a team lead because I could mentor others and see direct impact…' },
    ],
  },
  {
    key: 'jobs_not_enjoyed',
    title: "Jobs You Didn't Enjoy",
    description: 'Which roles were not a good fit, and why?',
    icon: 'Frown',
    fields: [
      { key: 'jobs_not_enjoyed', label: "Jobs You Didn't Enjoy", type: 'textarea', placeholder: 'I struggled in a highly structured corporate environment where I had little autonomy…' },
    ],
  },
  {
    key: 'motivators',
    title: 'What Motivates You',
    description: 'What gets you excited about going to work?',
    icon: 'Flame',
    fields: [
      { key: 'motivators', label: 'What Motivates You', type: 'textarea', placeholder: 'I am motivated by solving complex problems, helping others grow, and seeing my work make a difference…' },
    ],
  },
  {
    key: 'biggest_challenge',
    title: 'Biggest Career Challenge',
    description: 'What is the biggest challenge in your career right now?',
    icon: 'Mountain',
    fields: [
      { key: 'biggest_challenge', label: 'Biggest Career Challenge', type: 'textarea', placeholder: 'My biggest challenge right now is transitioning from an individual contributor to a management role…' },
    ],
  },
  {
    key: 'application_authorization',
    title: 'Application Authorization',
    description: 'Authorize your Career Strategist to submit applications on your behalf.',
    icon: 'FileCheck',
    fields: [
      { key: 'application_authorized', label: 'I authorize FreshlyForward to research opportunities and submit applications on my behalf using my professional materials.', type: 'boolean', required: true, helpText: 'Your Strategist will personally research and hand-craft each application. You will review and approve before submission.' },
    ],
  },
  {
    key: 'document_upload',
    title: 'Document Upload',
    description: 'Upload your resume and any other documents you would like to share.',
    icon: 'Upload',
    fields: [
      { key: 'documents', label: 'Documents', type: 'text', helpText: 'You can upload your resume, cover letter, portfolio, or any other relevant documents.' },
    ],
  },
  {
    key: 'review',
    title: 'Review',
    description: 'Review your responses before submitting.',
    icon: 'ClipboardCheck',
    fields: [],
  },
  {
    key: 'electronic_consent',
    title: 'Electronic Consent',
    description: 'Confirm your consent to proceed.',
    icon: 'ShieldCheck',
    fields: [
      { key: 'electronic_consent', label: 'I consent to receive communications and updates from FreshlyForward electronically. I understand that my information will be used to provide Career Concierge services and will not be shared with third parties without my permission.', type: 'boolean', required: true },
    ],
  },
]
