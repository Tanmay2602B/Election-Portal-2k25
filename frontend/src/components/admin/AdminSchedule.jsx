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

// ─── Class Voting Batch Widget ────────────────────────────────────────────────
const ClassVotingBatchPanel = ({ votingSchedule, setVotingSchedule, availableClasses, studentCountByClass, students }) => {
    const [selectedClass, setSelectedClass] = useState('');
    // States:
    //  'idle'     — class selected, no batch ever run yet (no banner)
    //  'open'     — batch is currently live
    //  'cooldown' — batch stopped, 2-min cooldown counting down
    //  'ready'    — cooldown just finished (show amber "select next batch")
    //  'loading'  — checking backend cooldown state
    const [batchStatus, setBatchStatus] = useState('idle');
    const [cooldownSecs, setCooldownSecs] = useState(0);
    const [openingError, setOpeningError] = useState('');
    const timerRef = useRef(null);
    // Track whether this class has ever had a batch opened in this session
    const hasRunRef = useRef(false);

    const batchSize = votingSchedule.batchSize ?? 100;
    const batchEnabled = !!votingSchedule.batchVotingEnabled;

    const COOLDOWN_TOTAL = 120; // seconds

    // Poll cooldown state from backend — only updates if already in cooldown or open
    const fetchCooldown = useCallback(async (cls) => {
        if (!cls) return;
        try {
            const res = await api.get('/votes/cooldown');
            const state = res.data || {};
            if (state[cls]) {
                setCooldownSecs(state[cls].remainingSeconds);
                setBatchStatus('cooldown');
            } else if (batchStatus === 'cooldown') {
                // Cooldown just expired on the backend
                clearInterval(timerRef.current);
                setCooldownSecs(0);
                setBatchStatus('ready');
            }
            // If idle/open/ready — don't override local state
        } catch {
            // ignore network errors silently
        }
    }, [batchStatus]);

    // When class changes — reset to idle, check if there's an existing backend cooldown
    useEffect(() => {
        hasRunRef.current = false;
        if (!selectedClass) { setBatchStatus('idle'); return; }
        clearInterval(timerRef.current);
        setCooldownSecs(0);
        // Check backend — if a cooldown is already running for this class, show it
        api.get('/votes/cooldown').then(res => {
            const state = res.data || {};
            if (state[selectedClass]) {
                setCooldownSecs(state[selectedClass].remainingSeconds);
                setBatchStatus('cooldown');
                hasRunRef.current = true;
            } else {
                setBatchStatus('idle');
            }
        }).catch(() => setBatchStatus('idle'));
    }, [selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

    // Countdown tick — runs when in cooldown state
    useEffect(() => {
        clearInterval(timerRef.current);
        if (batchStatus !== 'cooldown') return;

        timerRef.current = setInterval(() => {
            setCooldownSecs(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setBatchStatus('ready');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [batchStatus]);

    // Poll backend every 5s to sync cooldown with other admin sessions
    useEffect(() => {
        if (!selectedClass || batchStatus === 'idle' || batchStatus === 'open') return;
        const poll = setInterval(() => fetchCooldown(selectedClass), 5000);
        return () => clearInterval(poll);
    }, [selectedClass, batchStatus, fetchCooldown]);

    // ── Open batch ────────────────────────────────────────────────────────────
    const handleOpenBatch = async () => {
        if (!selectedClass) return;
        setOpeningError('');
        hasRunRef.current = true;

        // Build the new schedule first — don't rely on stale prop in async context
        const newSchedule = {
            ...votingSchedule,
            batchClassFilter: [selectedClass],
            batchVotingEnabled: true
        };

        // Persist to backend FIRST — only update local state on success
        try {
            await api.post('/settings', { key: 'votingSchedule', value: newSchedule });
            // Only mark as open after the backend confirms
            setVotingSchedule(prev => ({
                ...prev,
                batchClassFilter: [selectedClass],
                batchVotingEnabled: true
            }));
            setBatchStatus('open');
        } catch (err) {
            const msg = err.response?.data?.msg || err.response?.data?.error || err.message || '';
            setOpeningError(`Failed to open batch: ${msg || 'Server error. Please try again.'}`);
            setBatchStatus('idle');
        }
    };

    // ── Stop batch → trigger 2-min cooldown ───────────────────────────────────
    const handleStopBatch = async () => {
        if (!selectedClass) return;
        setOpeningError('');

        const newSchedule = { ...votingSchedule, batchClassFilter: [] };

        // Update local state immediately so the UI responds
        setVotingSchedule(prev => ({ ...prev, batchClassFilter: [] }));
        setCooldownSecs(COOLDOWN_TOTAL);
        setBatchStatus('cooldown');

        // Persist to backend (non-fatal if fails)
        try {
            await api.post('/settings', { key: 'votingSchedule', value: newSchedule });
        } catch { /* non-fatal */ }

        // Register cooldown on backend
        try {
            await api.post('/votes/cooldown/start', { className: selectedClass });
        } catch { /* non-fatal — local countdown already started */ }
    };

    // ── Clear cooldown early ──────────────────────────────────────────────────
    const handleClearCooldown = async () => {
        if (!selectedClass) return;
        try {
            await api.delete(`/votes/cooldown/${encodeURIComponent(selectedClass)}`);
        } catch { /* ignore */ }
        clearInterval(timerRef.current);
        setCooldownSecs(0);
        setBatchStatus('ready');
    };

    // Progress bar: counts DOWN from 100% → 0%
    const cooldownProgress = COOLDOWN_TOTAL > 0
        ? Math.round((cooldownSecs / COOLDOWN_TOTAL) * 100)
        : 0;

    // ── Status banner ─────────────────────────────────────────────────────────
    const statusBanner = () => {
        if (!selectedClass) return null;

        if (batchStatus === 'loading') {
            return (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">
                    <RefreshCw size={15} className="animate-spin" />
                    Checking cooldown status…
                </div>
            );
        }

        if (batchStatus === 'open') {
            return (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-300 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Batch open — <strong className="ml-1">{selectedClass}</strong>
                            <span className="text-green-400/70 font-normal">
                                ({studentCountByClass[selectedClass] ?? 0} students)
                            </span>
                        </div>
                    </div>
                    {/* Stop Batch button inside the banner */}
                    <button
                        type="button"
                        onClick={handleStopBatch}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-sm font-medium transition-all"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                        Stop Batch &amp; Start Cooldown
                    </button>
                </div>
            );
        }

        if (batchStatus === 'cooldown') {
            return (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                            <Hourglass size={16} className="animate-pulse" />
                            Cooldown in progress — {fmtCountdown(cooldownSecs)} remaining
                        </div>
                        <button
                            type="button"
                            onClick={handleClearCooldown}
                            className="text-xs text-amber-400 hover:text-amber-200 underline underline-offset-2 transition-colors"
                        >
                            Clear early
                        </button>
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
            );
        }

        if (batchStatus === 'ready') {
            return (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium text-sm">
                    <CheckCircle size={16} />
                    Cooldown complete. Select the next voter batch.
                </div>
            );
        }

        return null;
    };

    // Open Batch allowed: class selected, idle or ready, voting is active
    const canOpen = selectedClass &&
        (batchStatus === 'idle' || batchStatus === 'ready') &&
        votingSchedule.isActive;

    return (
        <Card>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <Users size={20} className="text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Class Voting Batch</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5">
                Up to {batchSize} ballot submissions are processed simultaneously.
            </p>

            {/* Enable toggle */}
            <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
                <div
                    onClick={() => setVotingSchedule(prev => ({
                        ...prev,
                        batchVotingEnabled: !prev.batchVotingEnabled,
                        batchSize: prev.batchSize || 100,
                        batchClassFilter: prev.batchClassFilter || []
                    }))}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${batchEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${batchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-300 font-medium">
                    {batchEnabled ? 'Batch voting enabled' : 'Enable batch voting'}
                </span>
            </label>

            {batchEnabled && (
                <div className="space-y-4">

                    {/* Status banner */}
                    {statusBanner()}

                    {/* Error */}
                    {openingError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                            <AlertCircle size={15} />
                            {openingError}
                        </div>
                    )}

                    {/* Class dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => {
                                    setSelectedClass(e.target.value);
                                    setBatchStatus('idle');
                                    setOpeningError('');
                                }}
                                className="w-full glass-input px-4 py-3 rounded-xl text-white appearance-none pr-10 bg-[#1e293b] border border-white/10 focus:border-indigo-500 focus:outline-none cursor-pointer"
                            >
                                <option value="" className="bg-[#1e293b]">Select class</option>
                                {availableClasses.length === 0 && (
                                    <option disabled className="bg-[#1e293b] text-gray-500">No classes found</option>
                                )}
                                {availableClasses.map(cls => (
                                    <option key={cls} value={cls} className="bg-[#1e293b]">
                                        {cls} ({studentCountByClass[cls] ?? 0} students)
                                    </option>
                                ))}
                            </select>
                            {/* Chevron icon */}
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Batch size (compact) */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-sm text-gray-400">Max simultaneous submissions</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={votingSchedule.batchSize ?? 100}
                                onChange={(e) => {
                                    const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                                    setVotingSchedule(prev => ({ ...prev, batchSize: val }));
                                }}
                                className="glass-input w-16 px-2 py-1.5 rounded-lg text-center text-white text-sm"
                            />
                            <span className="text-xs text-gray-500">/ 100</span>
                        </div>
                    </div>

                    {/* Open Batch button */}
                    <button
                        type="button"
                        onClick={handleOpenBatch}
                        disabled={!canOpen}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border ${
                            canOpen
                                ? 'bg-[#1e293b] border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-400 cursor-pointer'
                                : 'bg-[#1e293b]/50 border-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <Play size={15} className={canOpen ? 'text-indigo-400' : 'text-gray-600'} />
                        Open Batch
                    </button>

                    {/* Hint */}
                    <p className="text-xs text-gray-500 text-center">
                        {!votingSchedule.isActive
                            ? 'Start voting in the election status panel before opening a batch.'
                            : !selectedClass
                            ? 'Select a class above to open a batch session.'
                            : batchStatus === 'cooldown'
                            ? 'Wait for the cooldown to finish, or clear it early above.'
                            : batchStatus === 'open'
                            ? `Batch is live. A 2-min cooldown will start after voting ends.`
                            : 'Ready — click Open Batch to begin.'}
                    </p>
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
                    <ClassVotingBatchPanel
                        votingSchedule={votingSchedule}
                        setVotingSchedule={setVotingSchedule}
                        availableClasses={availableClasses}
                        studentCountByClass={studentCountByClass}
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
