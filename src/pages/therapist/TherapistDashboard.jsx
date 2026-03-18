import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { mockTherapists } from '../../api/mock'
import SessionCard from '../../components/SessionCard'
import { Calendar, Clock, Users, CheckCircle, Plus, X, Loader2, FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { getToken } from '../../api/auth'
import { fetchMySessions } from '../../api/sessions'

export default function TherapistDashboard() {
    const { user } = useAuth()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAvailability, setShowAvailability] = useState(false)
    const [reports, setReports] = useState([])
    const [reportsLoading, setReportsLoading] = useState(true)
    const [expandedReport, setExpandedReport] = useState(null)

    const therapist = mockTherapists.find(t => t.id === user?.id)

    useEffect(() => {
        if (!user?.id) return
        fetchMySessions('therapist')
            .then(data => setSessions(data))
            .catch(() => setSessions([]))
            .finally(() => setLoading(false))
    }, [user?.id])

    const handleJoinSession = (session) => {
        const token = getToken()
        if (!session?.meeting_link || !token) return
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const meetingLink = session.meeting_link.startsWith('http')
            ? session.meeting_link
            : `${apiBase}${session.meeting_link}`
        window.location.href = `${meetingLink}?token=${encodeURIComponent(token)}`
    }

    // Fetch clinical reports (therapist only)
    useEffect(() => {
        const token = getToken()
        if (!token) return
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reports`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(d => { if (d.success) setReports(d.reports) })
            .catch(() => { })
            .finally(() => setReportsLoading(false))
    }, [])

    const upcomingSessions = sessions.filter(s => s.status === 'upcoming')
    const completedSessions = sessions.filter(s => s.status === 'completed')

    return (
        <div className="pt-16 min-h-screen bg-gradient-to-b from-wood-50 to-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-wood-800 tracking-tight">
                            Welcome, {user?.name?.split(' ').slice(0, 2).join(' ')} 👋
                        </h1>
                        <p className="text-wood-500 mt-1 text-sm">Your professional dashboard</p>
                    </div>
                    <button onClick={() => setShowAvailability(!showAvailability)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-wood-700 to-wood-600 hover:shadow-lg transition-all">
                        <Calendar className="w-4 h-4" /> Manage Availability
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: Calendar, label: 'Upcoming', value: upcomingSessions.length, bgColor: 'bg-wood-50', iconColor: 'text-wood-500' },
                        { icon: CheckCircle, label: 'Completed', value: completedSessions.length, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
                        { icon: Users, label: 'Total Patients', value: 12, bgColor: 'bg-beige-100', iconColor: 'text-beige-600' },
                    ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-wood-100">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-wood-800">{stat.value}</p>
                                <p className="text-xs text-wood-500">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Availability Panel */}
                {showAvailability && (
                    <div className="bg-white rounded-2xl border border-wood-100 p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-wood-800">Your Availability</h2>
                            <button onClick={() => setShowAvailability(false)} className="p-1 text-wood-400 hover:text-wood-600"><X className="w-5 h-5" /></button>
                        </div>
                        {therapist?.availability?.length > 0 ? (
                            <div className="space-y-3">
                                {therapist.availability.map(day => (
                                    <div key={day.date} className="flex flex-wrap items-center gap-3 p-3 bg-wood-50 rounded-xl">
                                        <span className="text-sm font-medium text-wood-700 min-w-[100px] flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-wood-500" /> {day.date}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {day.slots.map(slot => (
                                                <span key={slot} className="px-3 py-1 rounded-lg bg-beige-100 text-wood-700 text-xs font-medium flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {slot}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-wood-500">No availability set.</p>}
                        <button className="mt-4 flex items-center gap-1.5 text-sm font-medium text-wood-600 hover:text-wood-800 transition-colors">
                            <Plus className="w-4 h-4" /> Add availability slots
                        </button>
                    </div>
                )}

                {/* Sessions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-lg font-semibold text-wood-800 mb-4">Upcoming Sessions</h2>
                        {loading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-wood-400 animate-spin" /></div>
                        ) : upcomingSessions.length > 0 ? (
                            <div className="space-y-3">{upcomingSessions.map(s => <SessionCard key={s.id} session={{ ...s, therapistName: 'Patient' }} onJoin={handleJoinSession} />)}</div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-wood-100">
                                <Calendar className="w-10 h-10 text-wood-300 mx-auto mb-3" />
                                <p className="text-sm text-wood-500">No upcoming sessions</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-wood-800 mb-4">Session History</h2>
                        {completedSessions.length > 0 ? (
                            <div className="space-y-3">{completedSessions.map(s => <SessionCard key={s.id} session={{ ...s, therapistName: 'Patient' }} />)}</div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-wood-100">
                                <CheckCircle className="w-10 h-10 text-wood-300 mx-auto mb-3" />
                                <p className="text-sm text-wood-500">No completed sessions yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assessment Reports */}
                <div className="mt-10">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-wood-500" />
                        <h2 className="text-lg font-semibold text-wood-800">Assessment Reports</h2>
                        <span className="ml-auto text-xs text-wood-400 bg-wood-100 px-2.5 py-1 rounded-full">Therapist Only</span>
                    </div>

                    {reportsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-wood-400 animate-spin" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-wood-100">
                            <FileText className="w-10 h-10 text-wood-300 mx-auto mb-3" />
                            <p className="text-sm text-wood-500">No assessment reports yet.</p>
                            <p className="text-xs text-wood-400 mt-1">Reports appear here after chatbot assessments are completed.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(r => {
                                const isExpanded = expandedReport === r.id
                                const severityColors = {
                                    Minimal: 'bg-emerald-50 text-emerald-700',
                                    Mild: 'bg-yellow-50 text-yellow-700',
                                    Moderate: 'bg-orange-50 text-orange-700',
                                    Severe: 'bg-red-50 text-red-700',
                                }
                                const badgeColor = severityColors[r.severity] || 'bg-wood-50 text-wood-600'

                                return (
                                    <div key={r.id} className="bg-white rounded-2xl border border-wood-100 overflow-hidden">
                                        <button
                                            onClick={() => setExpandedReport(isExpanded ? null : r.id)}
                                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-wood-50/50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {r.tool_used && <span className="text-xs font-semibold text-wood-700 bg-wood-100 px-2 py-0.5 rounded">{r.tool_used}</span>}
                                                    {r.severity && <span className={`text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>{r.severity}</span>}
                                                    {r.score != null && <span className="text-xs text-wood-500">Score: {r.score}</span>}
                                                    {r.severity === 'Severe' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                                </div>
                                                <p className="text-xs text-wood-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-wood-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-wood-400 flex-shrink-0" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-wood-50">
                                                <p className="text-xs font-semibold text-wood-500 uppercase tracking-wide mt-4 mb-1">Clinical Report</p>
                                                <pre className="text-xs text-wood-700 whitespace-pre-wrap font-sans bg-wood-50 rounded-xl p-4 leading-relaxed">
                                                    {r.therapist_report}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
