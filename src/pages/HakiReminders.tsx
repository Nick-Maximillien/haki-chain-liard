import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"
import LawyerSidebar from "../components/LawyerSidebar"
import { Clock, Plus, Sparkles, X } from "lucide-react"
import TourGuide from "../components/TourGuide"

interface Reminder {
  id: string
  title: string
  description: string
  reminder_date: string
  status: string
  case_id?: string
}

export default function HakiReminders() {
  const { profile } = useAuth()
  const [showTour, setShowTour] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminder_date: "",
  })

  useEffect(() => {
    if (profile) {
      loadReminders()
    }
  }, [profile])

  async function loadReminders() {
    try {
      const { data, error } = await supabase
        .from("case_reminders")
        .select("*")
        .eq("lawyer_id", profile?.id)
        .order("reminder_date", { ascending: true })

      if (error) throw error
      setReminders(data || [])
    } catch (error) {
      console.error("Error loading reminders:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title || !formData.reminder_date) return

    try {
      const { error } = await supabase.from("case_reminders").insert({
        lawyer_id: profile?.id,
        title: formData.title,
        description: formData.description,
        reminder_date: formData.reminder_date,
        status: "scheduled",
      })

      if (error) throw error

      setFormData({ title: "", description: "", reminder_date: "" })
      setShowNewModal(false)
      loadReminders()
    } catch (error) {
      console.error("Error creating reminder:", error)
      alert("Failed to create reminder")
    }
  }

  const scheduledReminders = reminders.filter((r) => r.status === "scheduled")
  const sentReminders = reminders.filter((r) => r.status === "sent")
  const historyReminders = reminders.filter((r) => r.status === "history")

  return (
    <div className="flex min-h-screen bg-gray-50">
      {showTour && <TourGuide onComplete={() => setShowTour(false)} />}
      <LawyerSidebar onTourStart={() => setShowTour(true)} />
      <div className="flex-1 ml-[280px] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">HakiReminders</h1>
                </div>
                <p className="text-gray-600">AI-powered reminder management with Kanban workflow</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                  <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs">0</span>
                </button>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  New Reminder
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="bg-blue-50 border-l-4 border-blue-600 px-4 py-2 mb-4">
                <h3 className="font-semibold text-blue-900">Scheduled ({scheduledReminders.length})</h3>
              </div>
              <div className="space-y-3">
                {scheduledReminders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No scheduled reminders</p>
                  </div>
                ) : (
                  scheduledReminders.map((reminder) => (
                    <div key={reminder.id} className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{reminder.title}</h4>
                      {reminder.description && <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>}
                      <p className="text-xs text-gray-500">
                        {new Date(reminder.reminder_date).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="bg-green-50 border-l-4 border-green-600 px-4 py-2 mb-4">
                <h3 className="font-semibold text-green-900">Sent ({sentReminders.length})</h3>
              </div>
              <div className="space-y-3">
                {sentReminders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No sent reminders</p>
                  </div>
                ) : (
                  sentReminders.map((reminder) => (
                    <div key={reminder.id} className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{reminder.title}</h4>
                      {reminder.description && <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>}
                      <p className="text-xs text-gray-500">
                        {new Date(reminder.reminder_date).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="bg-gray-50 border-l-4 border-gray-600 px-4 py-2 mb-4">
                <h3 className="font-semibold text-gray-900">History ({historyReminders.length})</h3>
              </div>
              <div className="space-y-3">
                {historyReminders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No history reminders</p>
                  </div>
                ) : (
                  historyReminders.map((reminder) => (
                    <div key={reminder.id} className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="font-medium text-gray-900 mb-1">{reminder.title}</h4>
                      {reminder.description && <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>}
                      <p className="text-xs text-gray-500">
                        {new Date(reminder.reminder_date).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Reminder Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Reminder</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
