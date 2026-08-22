import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Lock, Check, X, Loader2, Save, Settings, Eye, EyeOff,
  Sparkles, ArrowLeft, Plus,
} from 'lucide-react'
import type { Feature, MembershipPlan, PlanFeature } from '@/types'

interface PlanFeatureMatrix {
  feature: Feature
  planEnabled: Record<string, boolean>
}

export function FeatureEntitlementsPage() {
  const { user } = useAuth()
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [matrix, setMatrix] = useState<PlanFeatureMatrix[]>([])
  const [planFeatureMap, setPlanFeatureMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [editingFeature, setEditingFeature] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Feature>>({})
  const [previewPlan, setPreviewPlan] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [featuresRes, plansRes, planFeaturesRes] = await Promise.all([
      supabase.from('features').select('*').order('sort_order', { ascending: true }),
      supabase.from('membership_plans').select('*').eq('is_archived', false).order('sort_order', { ascending: true }),
      supabase.from('plan_features').select('*'),
    ])

    const featureList = (featuresRes.data as Feature[]) || []
    const planList = (plansRes.data as MembershipPlan[]) || []
    const pfRows = (planFeaturesRes.data as PlanFeature[]) || []

    const pfMap = new Map<string, string>()
    for (const row of pfRows) {
      pfMap.set(`${row.plan_id}:${row.feature_id}`, row.id)
    }
    setPlanFeatureMap(pfMap)

    const mat: PlanFeatureMatrix[] = featureList.map((f) => ({
      feature: f,
      planEnabled: Object.fromEntries(
        planList.map((p) => [p.id, pfRows.some((r) => r.plan_id === p.id && r.feature_id === f.id && r.is_enabled)])
      ),
    }))
    setFeatures(featureList)
    setPlans(planList)
    setMatrix(mat)
    setLoading(false)
  }

  const toggleFeature = async (planId: string, featureId: string, enable: boolean) => {
    setSaving(true)
    setSaveMsg(null)

    const mapKey = `${planId}:${featureId}`
    const existingId = planFeatureMap.get(mapKey)

    if (enable && !existingId) {
      const { data, error } = await supabase
        .from('plan_features')
        .insert({ plan_id: planId, feature_id: featureId, is_enabled: true })
        .select('*')
        .maybeSingle()
      if (!error && data) {
        setPlanFeatureMap((prev) => new Map(prev).set(mapKey, (data as PlanFeature).id))
        setMatrix((prev) =>
          prev.map((m) =>
            m.feature.id === featureId ? { ...m, planEnabled: { ...m.planEnabled, [planId]: true } } : m
          )
        )
      }
    } else if (existingId) {
      const { error } = await supabase
        .from('plan_features')
        .update({ is_enabled: enable })
        .eq('id', existingId)
      if (!error) {
        setMatrix((prev) =>
          prev.map((m) =>
            m.feature.id === featureId ? { ...m, planEnabled: { ...m.planEnabled, [planId]: enable } } : m
          )
        )
      }
    }
    setSaving(false)
    setSaveMsg(enable ? 'Feature enabled' : 'Feature disabled')
    setTimeout(() => setSaveMsg(null), 2000)
  }

  const startEdit = (feature: Feature) => {
    setEditingFeature(feature.id)
    setEditForm({
      display_name: feature.display_name,
      description: feature.description,
      visibility: feature.visibility,
      is_coming_soon: feature.is_coming_soon,
      upgrade_title: feature.upgrade_title,
      upgrade_body: feature.upgrade_body,
      upgrade_cta: feature.upgrade_cta,
    })
  }

  const saveEdit = async () => {
    if (!editingFeature) return
    setSaving(true)
    const { error } = await supabase
      .from('features')
      .update({
        display_name: editForm.display_name,
        description: editForm.description,
        visibility: editForm.visibility,
        is_coming_soon: editForm.is_coming_soon,
        upgrade_title: editForm.upgrade_title,
        upgrade_body: editForm.upgrade_body,
        upgrade_cta: editForm.upgrade_cta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingFeature)
    if (!error) {
      setMatrix((prev) =>
        prev.map((m) =>
          m.feature.id === editingFeature
            ? { ...m, feature: { ...m.feature, ...editForm as Feature } }
            : m
        )
      )
      setEditingFeature(null)
      setSaveMsg('Feature updated')
      setTimeout(() => setSaveMsg(null), 2000)
    }
    setSaving(false)
  }

  const cycleVisibility = async (featureId: string, current: string) => {
    const next = current === 'visible' ? 'locked' : current === 'locked' ? 'hidden' : 'visible'
    setSaving(true)
    const { error } = await supabase
      .from('features')
      .update({ visibility: next, updated_at: new Date().toISOString() })
      .eq('id', featureId)
    if (!error) {
      setMatrix((prev) =>
        prev.map((m) => (m.feature.id === featureId ? { ...m, feature: { ...m.feature, visibility: next } } : m))
      )
    }
    setSaving(false)
  }

  const filteredMatrix = previewPlan === 'all'
    ? matrix
    : matrix.filter((m) => m.planEnabled[previewPlan])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/admin" className="mb-4 flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary-600" />
              <h1 className="font-serif text-2xl font-semibold text-neutral-900">Feature Entitlements</h1>
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              Manage which features each membership plan includes. Changes take effect immediately.
            </p>
          </div>
          {saveMsg && (
            <div className="rounded-lg bg-success-50 px-4 py-2 text-sm font-medium text-success-700">
              {saveMsg}
            </div>
          )}
        </div>

        {/* Preview filter */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <span className="text-sm font-medium text-neutral-700">Preview as plan:</span>
          <select
            value={previewPlan}
            onChange={(e) => setPreviewPlan(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All plans (full matrix)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Entitlement Matrix */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Feature
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {p.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Visibility
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((row) => (
                  <tr key={row.feature.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">{row.feature.display_name}</span>
                        {row.feature.is_coming_soon && (
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-700">Soon</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{row.feature.feature_key}</p>
                    </td>
                    {plans.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleFeature(p.id, row.feature.id, !row.planEnabled[p.id])}
                          disabled={saving}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                            row.planEnabled[p.id]
                              ? 'bg-success-100 text-success-700 hover:bg-success-200'
                              : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                          }`}
                        >
                          {row.planEnabled[p.id] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => cycleVisibility(row.feature.id, row.feature.visibility)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        {row.feature.visibility === 'visible' ? (
                          <><Eye className="h-3 w-3" /> Visible</>
                        ) : row.feature.visibility === 'locked' ? (
                          <><Lock className="h-3 w-3" /> Locked</>
                        ) : (
                          <><EyeOff className="h-3 w-3" /> Hidden</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => startEdit(row.feature)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit modal */}
        {editingFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingFeature(null)}>
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-serif text-lg font-semibold text-neutral-900">Edit Feature</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Display Name</label>
                  <input
                    type="text"
                    value={editForm.display_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Upgrade Modal Title</label>
                  <input
                    type="text"
                    value={editForm.upgrade_title || ''}
                    onChange={(e) => setEditForm({ ...editForm, upgrade_title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Upgrade Modal Body</label>
                  <textarea
                    value={editForm.upgrade_body || ''}
                    onChange={(e) => setEditForm({ ...editForm, upgrade_body: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Upgrade CTA Label</label>
                  <input
                    type="text"
                    value={editForm.upgrade_cta || ''}
                    onChange={(e) => setEditForm({ ...editForm, upgrade_cta: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coming-soon"
                    checked={editForm.is_coming_soon || false}
                    onChange={(e) => setEditForm({ ...editForm, is_coming_soon: e.target.checked })}
                    className="rounded border-neutral-300"
                  />
                  <label htmlFor="coming-soon" className="text-sm text-neutral-700">Mark as Coming Soon</label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setEditingFeature(null)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
