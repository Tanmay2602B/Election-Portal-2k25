import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
    Calendar, Clock, CheckCircle, AlertCircle, RefreshCw,
    AlertTriangle, Info, Users, Play, Hourglass
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LiveClock from '../LiveClock';
import api from '../../utils/api';

// Helper: convert UTC ISO string → local datetime-local format for <input>
const toLocalInput = (isoStr) => {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
        return isoStr;
    }
};

// Format seconds → "1:45"
const fmtCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

// ─── Voting Batch Panel (new) ─────────────────────────────────────────────────
const VotingBatchPanel = ({ votingSchedule, students }) => {
    const [batchData, setBatchData] = useState(null);   // { batch, roster, remainingCount }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [cooldownSecs, setCooldownSecs] = useState(0);
    const timerRef = useRef(null);
    const refreshRef = useRef(null);

    // Derive unique sorted classes from students prop
    const availableClasses = useMemo(() => {
        const classSet = new Set(students.map(s => (s.class || '').trim()).filter(Boolean));
        return [...classSet].sort((a, b) => a.localeCompare(b));
    }, [students]);

    // Fetch batch from backend
    const fetchBatch = useCallback(async () => {
        try {
            const res = await api.get('/voting-batch');
            setBatchData(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to load batch status.');
        } finally {
            setLoading(false);
        }
    }, []);

    // On mount: fetch batch once
    useEffect(() => {
        fetchBatch();
    }, [fetchBatch]);

    // Auto-refresh every 5s when batch is open
    useEffect(() => {
        clearInterval(refreshRef.current);
        if (batchData?.batch?.status === 'open') {
            refreshRef.current = setInterval(fetchBatch, 5000);
        }
        return () => clearInterval(refreshRef.current);
    }, [batchData?.batch?.status, fetchBatch]);

    // Cooldown countdown: tick from cooldownUntil
    useEffect(() => {
        clearInterval(timerRef.current);
        if (batchData?.batch?.status !== 'cooldown' || !batchData?.batch?.cooldownUntil) return;

        const tick = () => {
            const secs = Math.max(0, Math.ceil((new Date(batchData.batch.cooldownUntil) - Date.now()) / 1000));
            setCooldownSecs(secs);
            if (secs === 0) {
                clearInterval(timerRef.current);
                fetchBatch(); // re-fetch to sync status
            }
        };
        tick(); // run immediately
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [batchData?.batch?.status, batchData?.batch?.cooldownUntil, fetchBatch]);

    // When class changes in IDLE view: pre-populate selectedStudentIds
    const handleClassChange = (cls) => {
        setSelectedClass(cls);
        if (cls) {
            const unvoted = students.filter(s => (s.class || '').trim() === cls && !s.hasVoted);
            setSelectedStudentIds(new Set(unvoted.map(s => s.studentId)));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    // Unvoted students for the selected class
    const unvotedStudents = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => (s.class || '').trim() === selectedClass && !s.hasVoted);
    }, [students, selectedClass]);

    const allSelected = unvotedStudents.length > 0 && unvotedStudents.every(s => selectedStudentIds.has(s.studentId));

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(unvotedStudents.map(s => s.studentId)));
        }
    };

    const handleToggleStudent = (id) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Open batch
    const handleOpenBatch = async () => {
        if (!selectedClass || selectedStudentIds.size === 0) return;
        setSubmitting(true);
        setError('');
        try {
            await api.post('/voting-batch', {
                className: selectedClass,
                studentIds: [...selectedStudentIds]
            });
            await fetchBatch();
        } catch (err) {
            setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to open batch. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Close batch
    const handleCloseBatch = async () => {
        setSubmitting(true);
        setError('');
        try {
            await api.post('/voting-batch/close');
            await fetchBatch();
        } catch (err) {
            setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to close batch.');
        } finally {
            setSubmitting(false);
        }
    };

    // Clear cooldown early
    const handleClearCooldown = async () => {
        setSubmitting(true);
        setError('');
        try {
            await api.post('/voting-batch/clear-cooldown');
            await fetchBatch();
        } catch (err) {
            setError(err.response?.data?.msg || err.response?.data?.error || 'Failed to clear cooldown.');
        } finally {
            setSubmitting(false);
        }
    };

    const COOLDOWN_TOTAL = 120;
    const cooldownProgress = COOLDOWN_TOTAL > 0 ? Math.round((cooldownSecs / COOLDOWN_TOTAL) * 100) : 0;

    const batchStatus = batchData?.batch?.status ?? 'idle';
    const batch = batchData?.batch ?? {};
    const roster = batchData?.roster ?? [];
    const remainingCount = batchData?.remainingCount ?? 0;

    if (loading) {
        return (
            <Card>
                <div className="flex items-center gap-2 mb-1">
                    <Users size={20} className="text-indigo-400" />
                    <h3 className="text-lg font-bold text-white">Class Voting Batch</h3>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm mt-4">
                    <RefreshCw size={15} className="animate-spin" />
                    Loading batch status…
                </div>
            </Card>
        );
    }

    return (
        <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Users size={20} className="text-indigo-400" />
                    <h3 className="text-lg font-bold text-white">Class Voting Batch</h3>
                </div>
                <button
                    type="button"
                    onClick={fetchBatch}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                    title="Refresh"
                >
                    <RefreshCw size={14} />
                </button>
            </div>
            <p className="text-sm text-gray-400 mb-5">
                Up to 100 ballot submissions are processed simultaneously.
            </p>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-4">
                    <AlertCircle size={15} />
                    {error}
                </div>
            )}

            {/* ── IDLE view ── */}
            {batchStatus === 'idle' && (
                <div className="space-y-4">
                    {/* Class dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => handleClassChange(e.target.value)}
                                className="w-full glass-input px-4 py-3 rounded-xl text-white appearance-none pr-10 bg-[#1e293b] border border-white/10 focus:border-indigo-500 focus:outline-none cursor-pointer"
                            >
                                <option value="" className="bg-[#1e293b]">Select class</option>
                                {availableClasses.length === 0 && (
                                    <option disabled className="bg-[#1e293b] text-gray-500">No classes found</option>
                                )}
                                {availableClasses.map(cls => {
                                    const cnt = students.filter(s => (s.class || '').trim() === cls && !s.hasVoted).length;
                                    return (
                                        <option key={cls} value={cls} className="bg-[#1e293b]">
                                            {cls} ({cnt} unvoted)
                                        </option>
                                    );
                                })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Student checkbox list */}
                    {selectedClass && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-300">Students ({unvotedStudents.length} unvoted)</span>
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-xs text-indigo-400 hover:text-indigo-200 underline underline-offset-2"
                                >
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            {unvotedStudents.length === 0 ? (
                                <p className="text-sm text-gray-500 p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                    All students in this class have already voted.
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                    {unvotedStudents.map(s => {
                                        const sid = s.studentId;
                                        const checked = selectedStudentIds.has(sid);
                                        return (
                                            <label key={sid} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => handleToggleStudent(sid)}
                                                    className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                                />
                                                <span className="text-sm text-white">{s.name}</span>
                                                <span className="text-xs text-gray-500 ml-auto">{s.studentId}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Open Batch button */}
                    <button
                        type="button"
                        onClick={handleOpenBatch}
                        disabled={!selectedClass || selectedStudentIds.size === 0 || submitting || !votingSchedule.isActive}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border ${
                            selectedClass && selectedStudentIds.size > 0 && !submitting && votingSchedule.isActive
                                ? 'bg-[#1e293b] border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-400 cursor-pointer'
                                : 'bg-[#1e293b]/50 border-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Play size={15} className={selectedClass && selectedStudentIds.size > 0 && votingSchedule.isActive ? 'text-indigo-400' : 'text-gray-600'} />
                        {submitting ? 'Opening…' : `Open Batch (${selectedStudentIds.size} students)`}
                    </button>

                    {/* Hint */}
                    <p className="text-xs text-gray-500 text-center">
                        {!votingSchedule.isActive
                            ? 'Start voting in the election status panel before opening a batch.'
                            : !selectedClass
                            ? 'Select a class above to open a batch session.'
                            : selectedStudentIds.size === 0
                            ? 'Select at least one student to open a batch.'
                            : 'Ready — click Open Batch to begin.'}
                    </p>
                </div>
            )}

            {/* ── OPEN view ── */}
            {batchStatus === 'open' && (
                <div className="space-y-4">
                    {/* Status header */}
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center gap-2 text-green-300 font-medium text-sm mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Batch Open — <strong className="ml-1">{batch.className}</strong>
                            <span className="text-green-400/70 font-normal ml-1">Batch #{batch.batchNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Opened: {batch.openedAt ? new Date(batch.openedAt).toLocaleTimeString() : '—'}</span>
                            <span className="text-green-300 font-semibold">{remainingCount} remaining</span>
                        </div>
                    </div>

                    {/* Roster table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 text-xs border-b border-white/10">
                                    <th className="pb-2 pr-4 font-medium">Name</th>
                                    <th className="pb-2 pr-4 font-medium">Student ID</th>
                                    <th className="pb-2 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {roster.map((r, i) => (
                                    <tr key={r.studentId || i} className="text-gray-300">
                                        <td className="py-2 pr-4 font-medium text-white">{r.name}</td>
                                        <td className="py-2 pr-4 font-mono text-sm text-indigo-300 font-semibold">{r.studentId}</td>
                                        <td className="py-2">
                                            {r.hasVoted
                                                ? <span className="text-green-400 text-xs font-medium">✅ Voted</span>
                                                : <span className="text-amber-400 text-xs font-medium">⏳ Waiting</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                                {roster.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-500 text-xs">No roster data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Close Batch button */}
                    <button
                        type="button"
                        onClick={handleCloseBatch}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                        {submitting ? 'Closing…' : 'Close Batch'}
                    </button>
                    <p className="text-xs text-gray-500 text-center">Closing starts a 2-minute cooldown before the next batch can open.</p>
                </div>
            )}

            {/* ── COOLDOWN view ── */}
            {batchStatus === 'cooldown' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                                <Hourglass size={16} className="animate-pulse" />
                                Cooldown in progress — {fmtCountdown(cooldownSecs)} remaining
                            </div>
                        </div>
                        {/* Progress bar — drains left to right */}
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                                style={{ width: `${cooldownProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-amber-400/70">
                            Seat the next class during this cooldown. Voting opens again in {fmtCountdown(cooldownSecs)}.
                        </p>
                    </div>

                    {/* Clear Cooldown Early button */}
                    <button
                        type="button"
                        onClick={handleClearCooldown}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle size={14} />
                        {submitting ? 'Clearing…' : 'Clear Cooldown Early'}
                    </button>
                </div>
            )}
        </Card>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminSchedule = ({
    votingSchedule,
    setVotingSchedule,
    handleSaveSchedule,
    saving,
    saveStatus,
    formatDuration,
    handleStartVoting,
    handleEndVoting,
    loadData,
    students = []
}) => {
    const start = votingSchedule.votingStart ? new Date(votingSchedule.votingStart) : null;
    const end   = votingSchedule.votingEnd   ? new Date(votingSchedule.votingEnd)   : null;
    const now   = new Date();

    // Derive unique classes from students, sorted alphabetically
    const availableClasses = useMemo(() => {
        const classSet = new Set(students.map(s => (s.class || '').trim()).filter(Boolean));
        return [...classSet].sort((a, b) => a.localeCompare(b));
    }, [students]);

    const studentCountByClass = useMemo(() => {
        const map = {};
        students.forEach(s => {
            const cls = (s.class || '').trim();
            if (cls) map[cls] = (map[cls] || 0) + 1;
        });
        return map;
    }, [students]);

    const validation = useMemo(() => {
        const errors = [];
        if (!votingSchedule.votingStart) errors.push('Start date & time is required.');
        if (!votingSchedule.votingEnd)   errors.push('End date & time is required.');
        if (start && end) {
            if (end <= start) errors.push('End time must be after start time.');
            if (start < now && !votingSchedule.isActive) errors.push('Start time is in the past. Consider updating it.');
        }
        return errors;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [votingSchedule.votingStart, votingSchedule.votingEnd, votingSchedule.isActive]);

    const durationMs    = start && end ? end - start : null;
    const durationValid = durationMs !== null && durationMs > 0;
    const tzName        = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white">Election Schedule</h2>
                    <p className="text-gray-400 text-sm">Configure timing and voting rules</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Info size={12} />
                        Times shown in {tzName}
                    </span>
                    <Button onClick={loadData} icon={RefreshCw} variant="ghost">Refresh</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left column ─────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Timing */}
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Calendar className="text-indigo-400" size={20} />
                            Timing Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Start Date &amp; Time
                                    <span className="ml-2 text-xs text-gray-500">({tzName})</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={toLocalInput(votingSchedule.votingStart)}
                                    onChange={(e) => {
                                        const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
                                        setVotingSchedule(prev => ({ ...prev, votingStart: iso }));
                                    }}
                                    className={`glass-input w-full px-4 py-3 rounded-xl ${validation.some(e => e.includes('Start')) ? 'border-red-500/50' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    End Date &amp; Time
                                    <span className="ml-2 text-xs text-gray-500">({tzName})</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={toLocalInput(votingSchedule.votingEnd)}
                                    min={toLocalInput(votingSchedule.votingStart)}
                                    onChange={(e) => {
                                        const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
                                        setVotingSchedule(prev => ({ ...prev, votingEnd: iso }));
                                    }}
                                    className={`glass-input w-full px-4 py-3 rounded-xl ${validation.some(e => e.includes('End') || e.includes('after')) ? 'border-red-500/50' : ''}`}
                                />
                            </div>
                        </div>

                        {start && end && (
                            <div className={`p-4 rounded-xl mb-6 border ${durationValid ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className={`flex items-center gap-2 text-sm ${durationValid ? 'text-indigo-300' : 'text-red-400'}`}>
                                    <Clock size={16} />
                                    {durationValid
                                        ? <span>Duration: <strong>{formatDuration(durationMs)}</strong></span>
                                        : <span>⚠ End time must be after start time</span>
                                    }
                                </div>
                            </div>
                        )}

                        {validation.length > 0 && (
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-6 space-y-1">
                                {validation.map((err, i) => (
                                    <div key={i} className="flex items-center gap-2 text-orange-300 text-sm">
                                        <AlertTriangle size={14} />
                                        {err}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                Save schedule first, then use Start/End buttons to control voting access.
                            </p>
                            <Button
                                onClick={handleSaveSchedule}
                                disabled={!votingSchedule.votingStart || !votingSchedule.votingEnd || !durationValid || saving}
                                variant={saveStatus === 'success' ? 'success' : saveStatus === 'error' ? 'danger' : 'primary'}
                                icon={saveStatus === 'success' ? CheckCircle : saveStatus === 'error' ? AlertCircle : Calendar}
                            >
                                {saving ? 'Saving…' : saveStatus === 'success' ? 'Saved ✓' : saveStatus === 'error' ? 'Save Failed' : 'Save Schedule'}
                            </Button>
                        </div>
                    </Card>

                    {/* Advanced Settings */}
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-6">Advanced Settings</h3>
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                <input
                                    type="checkbox"
                                    checked={votingSchedule.enableDepartmentalVoting}
                                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, enableDepartmentalVoting: e.target.checked }))}
                                    className="mt-1 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                />
                                <div>
                                    <span className="block font-medium text-white">Departmental Voting</span>
                                    <span className="block text-sm text-gray-400 mt-1">Enable separate elections per department</span>
                                </div>
                            </label>

                            {votingSchedule.enableDepartmentalVoting && (
                                <div className="ml-8 animate-fade-in">
                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                        <input
                                            type="checkbox"
                                            checked={votingSchedule.allowCrossDepartmentVoting}
                                            onChange={(e) => setVotingSchedule(prev => ({ ...prev, allowCrossDepartmentVoting: e.target.checked }))}
                                            className="mt-1 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                        />
                                        <div>
                                            <span className="block font-medium text-white">Cross-Department Voting</span>
                                            <span className="block text-sm text-gray-400 mt-1">Allow students to vote for candidates in other departments</span>
                                        </div>
                                    </label>
                                    {!votingSchedule.allowCrossDepartmentVoting && (
                                        <div className="mt-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 text-orange-300 text-sm">
                                            <AlertCircle size={16} />
                                            Students will be restricted to their own department's candidates.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Class Voting Batch — new operational panel */}
                    <VotingBatchPanel
                        votingSchedule={votingSchedule}
                        students={students}
                    />
                </div>

                {/* ── Right column — Status ───────────────────────────────── */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
                        <div className="mb-6 flex justify-center">
                            <LiveClock showIcon={true} />
                        </div>

                        <div className={`p-6 rounded-2xl mb-6 text-center border ${
                            votingSchedule.isActive
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                        }`}>
                            <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${
                                votingSchedule.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`} />
                            <h4 className={`text-lg font-bold ${votingSchedule.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                {votingSchedule.isActive ? 'VOTING ACTIVE' : 'VOTING CLOSED'}
                            </h4>
                            <p className="text-sm text-gray-400 mt-2">
                                {votingSchedule.isActive ? 'Students can cast votes' : 'Voting access is disabled'}
                            </p>
                        </div>

                        {start && end && durationValid && (
                            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs text-gray-400">
                                <div className="flex justify-between">
                                    <span>Opens</span>
                                    <span className="text-white font-medium">{start.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Closes</span>
                                    <span className="text-white font-medium">{end.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Duration</span>
                                    <span className="text-indigo-300 font-medium">{formatDuration(durationMs)}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                onClick={handleStartVoting}
                                disabled={votingSchedule.isActive}
                                variant="success"
                                className="w-full justify-center"
                            >
                                ▶ Start Voting Now
                            </Button>
                            <Button
                                onClick={handleEndVoting}
                                disabled={!votingSchedule.isActive}
                                variant="danger"
                                className="w-full justify-center"
                            >
                                ■ End Voting Now
                            </Button>
                        </div>

                        <p className="mt-4 text-xs text-gray-500 text-center">
                            These buttons immediately open/close voting for all students regardless of schedule.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminSchedule;
