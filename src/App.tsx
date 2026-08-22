import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { SiteHeader, SiteFooter } from '@/components/PublicLayout'
import { LandingPage } from '@/pages/LandingPage'
import { PricingPage } from '@/pages/PricingPage'
import { HowItWorksPage } from '@/pages/HowItWorksPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { WhyFreshlyForwardPage } from '@/pages/WhyFreshlyForwardPage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
import { FaqPage } from '@/pages/FaqPage'
import { ForwardFeedPage } from '@/pages/ForwardFeedPage'
import { ForwardFeedPostPage } from '@/pages/ForwardFeedPostPage'
import { AuthorizationPage } from '@/pages/AuthorizationPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CareerProfilePage } from '@/pages/CareerProfilePage'
import { MembershipPage } from '@/pages/MembershipPage'
import { CareerSuccessPage } from '@/pages/CareerSuccessPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { MessagesPage } from '@/pages/MessagesPage'
import { MemberOpportunitiesPage } from '@/pages/MemberOpportunitiesPage'
import { OpportunityEnginePage } from '@/pages/OpportunityEnginePage'
import { LinkedInOptimizerPage } from '@/pages/LinkedInOptimizerPage'
import { MemberApplicationsPage } from '@/pages/MemberApplicationsPage'
import { WhyWeAppliedPage } from '@/pages/WhyWeAppliedPage'
import { FoundingMemberPage } from '@/pages/FoundingMemberPage'
import { FridayReportsPage } from '@/pages/FridayReportsPage'
import { MockInterviewPage } from '@/pages/MockInterviewPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { CommunicationPreferencesPage } from '@/pages/CommunicationPreferencesPage'
import { ActivityFeedPage } from '@/pages/ActivityFeedPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { ToolsPage } from '@/pages/ToolsPage'
import { AchievementVaultPage } from '@/pages/AchievementVaultPage'
import { RoadmapPage } from '@/pages/RoadmapPage'
import { FeatureEntitlementsPage } from '@/pages/strategist/FeatureEntitlementsPage'
import { StrategistDashboardPage } from '@/pages/strategist/StrategistDashboardPage'
import { StrategistMembersPage } from '@/pages/strategist/StrategistMembersPage'
import { StrategistMemberWorkspacePage } from '@/pages/strategist/StrategistMemberWorkspacePage'
import { StrategistOpportunitiesPage } from '@/pages/strategist/StrategistOpportunitiesPage'
import { StrategistOpportunityEnginePage } from '@/pages/strategist/StrategistOpportunityEnginePage'
import { StrategistApplicationsPage } from '@/pages/strategist/StrategistApplicationsPage'
import { StrategistFridayReportsPage } from '@/pages/strategist/StrategistFridayReportsPage'
import { AdminReportReviewPage } from '@/pages/strategist/AdminReportReviewPage'
import { AdminDashboardPage } from '@/pages/strategist/AdminDashboardPage'
import { AdminMembersPage } from '@/pages/strategist/AdminMembersPage'
import { AdminMemberDetailPage } from '@/pages/strategist/AdminMemberDetailPage'
import { BlogManagementPage } from '@/pages/strategist/BlogManagementPage'
import { BlogPostEditorPage } from '@/pages/strategist/BlogPostEditorPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoadingScreen } from '@/components/LoadingScreen'
import { MemberLayout } from '@/components/MemberLayout'
import { StrategistLayout } from '@/components/StrategistLayout'

const publicRoutes = [
  '/', '/pricing', '/how-it-works', '/services', '/why-freshlyforward',
  '/about', '/contact', '/faq', '/authorization', '/privacy', '/terms',
  '/signin', '/signup', '/forward-feed',
]

function App() {
  const { loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  const isPublicRoute = publicRoutes.some((route) =>
    route === '/' ? location.pathname === '/' : location.pathname.startsWith(route)
  )

  return (
    <>
      {isPublicRoute && <SiteHeader />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/why-freshlyforward" element={<WhyFreshlyForwardPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/forward-feed" element={<ForwardFeedPage />} />
        <Route path="/forward-feed/:slug" element={<ForwardFeedPostPage />} />
        <Route path="/authorization" element={<AuthorizationPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Checkout */}
        <Route
          path="/checkout/:planSlug"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* Member routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <MemberLayout><OnboardingPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MemberLayout><DashboardPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MemberLayout><CareerProfilePage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/membership"
          element={
            <ProtectedRoute>
              <MemberLayout><MembershipPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/career-success"
          element={
            <ProtectedRoute feature="workplace_success_coaching" requiredPlan="career-concierge">
              <MemberLayout><CareerSuccessPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <MemberLayout><TimelinePage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MemberLayout><MessagesPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <ProtectedRoute>
              <MemberLayout><MemberOpportunitiesPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunity-engine"
          element={
            <ProtectedRoute>
              <MemberLayout><OpportunityEnginePage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/linkedin-optimizer"
          element={
            <ProtectedRoute>
              <MemberLayout><LinkedInOptimizerPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <MemberLayout><MemberApplicationsPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/why-we-applied/:applicationId"
          element={
            <ProtectedRoute>
              <MemberLayout><WhyWeAppliedPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/founding-member"
          element={
            <ProtectedRoute>
              <MemberLayout><FoundingMemberPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friday-reports"
          element={
            <ProtectedRoute>
              <MemberLayout><FridayReportsPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock-interviews"
          element={
            <ProtectedRoute feature="mock_interviews" requiredPlan="career-growth">
              <MemberLayout><MockInterviewPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <MemberLayout><CalendarPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <MemberLayout><NotificationsPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/communication"
          element={
            <ProtectedRoute>
              <MemberLayout><CommunicationPreferencesPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <MemberLayout><ActivityFeedPage /></MemberLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/interviews"
          element={
            <ProtectedRoute>
              <MemberLayout><InterviewsPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <MemberLayout><ToolsPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/achievement-vault"
          element={
            <ProtectedRoute feature="achievement_vault" requiredPlan="career-concierge">
              <MemberLayout><AchievementVaultPage /></MemberLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute feature="career_roadmap" requiredPlan="career-concierge">
              <MemberLayout><RoadmapPage /></MemberLayout>
            </ProtectedRoute>
          }
        />

        {/* Strategist routes */}
        <Route
          path="/strategist"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistDashboardPage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/members"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistMembersPage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/members/:memberId"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistMemberWorkspacePage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/opportunities"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistOpportunitiesPage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/opportunity-engine"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistOpportunityEnginePage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/applications"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistLayout><StrategistApplicationsPage /></StrategistLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/friday-reports"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <StrategistFridayReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-review"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminReportReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/blog-posts"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <BlogManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategist/blog-posts/:postId"
          element={
            <ProtectedRoute roles={['strategist', 'admin']}>
              <BlogPostEditorPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminMembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members/:memberId"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminMemberDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-admin/feature-entitlements"
          element={
            <ProtectedRoute roles={['admin']}>
              <FeatureEntitlementsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isPublicRoute && <SiteFooter />}
    </>
  )
}

export default App
