import React, { useMemo } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, RefreshCw, AlertTriangle, Info, Users, Filter } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LiveClock from '../LiveClock';

// Helper: convert UTC ISO string → local datetime-local format for <input>
const toLocalInput = (isoStr) => {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr; // already local format, pass through
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
        return isoStr;
    }
};

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
    const end = votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd) : null;
    const now = new Date();

    // Derive unique classes from students, sorted alphabetically
    const availableClasses = useMemo(() => {
        const classSet = new Set(
            students.map(s => (s.class || '').trim()).filter(Boolean)
        );
        return [...classSet].sort((a, b) => a.localeCompare(b));
    }, [students]);

    // Student count per class
    const studentCountByClass = useMemo(() => {
        const map = {};
        students.forEach(s => {
            const cls = (s.class || '').trim();
            if (cls) map[cls] = (map[cls] || 0) + 1;
        });
        return map;
    }, [students]);

    // Currently selected filter
    const selectedClasses = votingSchedule.batchClassFilter || [];

    const toggleClass = (cls) => {
        const current = votingSchedule.batchClassFilter || [];
        const next = current.includes(cls)
            ? current.filter(c => c !== cls)
            : [...current, cls];
        setVotingSchedule(prev => ({ ...prev, batchClassFilter: next }));
    };

    const selectAll = () => setVotingSchedule(prev => ({ ...prev, batchClassFilter: [] }));
    const deselectAll = () => setVotingSchedule(prev => ({ ...prev, batchClassFilter: [] }));

    // Total students in selected classes (or all if none selected)
    const filteredStudentCount = useMemo(() => {
        if (selectedClasses.length === 0) return students.length;
        return students.filter(s => selectedClasses.includes((s.class || '').trim())).length;
    }, [students, selectedClasses]);

    // Validation
    const validation = useMemo(() => {
        const errors = [];
        if (!votingSchedule.votingStart) errors.push('Start date & time is required.');
        if (!votingSchedule.votingEnd) errors.push('End date & time is required.');
        if (start && end) {
            if (end <= start) errors.push('End time must be after start time.');
            if (start < now && !votingSchedule.isActive) errors.push('Start time is in the past. Consider updating it.');
        }
        return errors;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [votingSchedule.votingStart, votingSchedule.votingEnd, votingSchedule.isActive]);

    const durationMs = start && end ? end - start : null;
    const durationValid = durationMs !== null && durationMs > 0;

    // Detect local timezone abbreviation
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <div className="space-y-6 animate-fade-in">
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
                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
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
                                        // Store as ISO UTC for consistency
                                        const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
                                        setVotingSchedule(prev => ({ ...prev, votingStart: iso }));
                                    }}
                                    className={`glass-input w-full px-4 py-3 rounded-xl ${
                                        validation.some(e => e.includes('Start')) ? 'border-red-500/50' : ''
                                    }`}
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
                                    className={`glass-input w-full px-4 py-3 rounded-xl ${
                                        validation.some(e => e.includes('End') || e.includes('after')) ? 'border-red-500/50' : ''
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Duration display */}
                        {start && end && (
                            <div className={`p-4 rounded-xl mb-6 border ${durationValid
                                ? 'bg-indigo-500/10 border-indigo-500/20'
                                : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className={`flex items-center gap-2 text-sm ${durationValid ? 'text-indigo-300' : 'text-red-400'}`}>
                                    <Clock size={16} />
                                    {durationValid
                                        ? <span>Duration: <strong>{formatDuration(durationMs)}</strong></span>
                                        : <span>⚠ End time must be after start time</span>
                                    }
                                </div>
                            </div>
                        )}

                        {/* Validation errors */}
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
                                {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved ✓' : saveStatus === 'error' ? 'Save Failed' : 'Save Schedule'}
                            </Button>
                        </div>
                    </Card>

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

                    {/* Class Voting Batch */}
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Users className="text-indigo-400" size={20} />
                            Class Voting Batch
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Process multiple ballot submissions simultaneously — up to 100 at a time.
                            Ideal for classroom-supervised voting sessions.
                        </p>

                        <div className="space-y-4">
                            {/* Enable toggle */}
                            <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                                <input
                                    type="checkbox"
                                    checked={!!votingSchedule.batchVotingEnabled}
                                    onChange={(e) => setVotingSchedule(prev => ({
                                        ...prev,
                                        batchVotingEnabled: e.target.checked,
                                        batchSize: prev.batchSize || 30,
                                        batchClassFilter: prev.batchClassFilter || []
                                    }))}
                                    className="mt-1 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                />
                                <div>
                                    <span className="block font-medium text-white">Enable Batch Voting</span>
                                    <span className="block text-sm text-gray-400 mt-1">
                                        Allow simultaneous ballot submissions for an entire class at once
                                    </span>
                                </div>
                            </label>

                            {votingSchedule.batchVotingEnabled && (
                                <div className="ml-8 animate-fade-in space-y-5">

                                    {/* ── Class Filter ───────────────────────────── */}
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Filter size={15} className="text-indigo-400" />
                                                <span className="text-sm font-medium text-gray-300">
                                                    Filter by Class
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedClasses.length > 0 && (
                                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                                        {selectedClasses.length} selected
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={selectedClasses.length === 0 ? deselectAll : selectAll}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                                                >
                                                    {selectedClasses.length === 0 ? 'All classes' : 'Clear filter'}
                                                </button>
                                            </div>
                                        </div>

                                        {availableClasses.length === 0 ? (
                                            <p className="text-xs text-gray-500 italic">
                                                No classes found. Add students with a class assigned first.
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {availableClasses.map(cls => {
                                                    const isSelected = selectedClasses.includes(cls);
                                                    const count = studentCountByClass[cls] || 0;
                                                    return (
                                                        <button
                                                            key={cls}
                                                            type="button"
                                                            onClick={() => toggleClass(cls)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <CheckCircle size={13} className="text-indigo-200" />
                                                            )}
                                                            {cls}
                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                                isSelected
                                                                    ? 'bg-indigo-500/40 text-indigo-100'
                                                                    : 'bg-white/10 text-gray-400'
                                                            }`}>
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Summary line */}
                                        <div className="flex items-center gap-2 pt-1 text-xs text-gray-400 border-t border-white/5">
                                            <Users size={13} />
                                            {selectedClasses.length === 0
                                                ? <span>All <strong className="text-white">{students.length}</strong> students eligible for batch</span>
                                                : <span>
                                                    <strong className="text-white">{filteredStudentCount}</strong> students
                                                    from {selectedClasses.length === 1
                                                        ? <strong className="text-indigo-300">{selectedClasses[0]}</strong>
                                                        : <>{selectedClasses.slice(0, -1).map(c => <strong key={c} className="text-indigo-300">{c}</strong>).reduce((a, b) => [a, ', ', b])} &amp; <strong className="text-indigo-300">{selectedClasses[selectedClasses.length - 1]}</strong></>
                                                    } eligible
                                                  </span>
                                            }
                                        </div>
                                    </div>

                                    {/* ── Batch size slider ───────────────────────── */}
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-medium text-gray-300">
                                                Max Simultaneous Submissions
                                            </label>
                                            <span className="text-lg font-bold text-indigo-300 min-w-[3rem] text-right">
                                                {votingSchedule.batchSize ?? 30}
                                            </span>
                                        </div>

                                        <input
                                            type="range"
                                            min={1}
                                            max={100}
                                            value={votingSchedule.batchSize ?? 30}
                                            onChange={(e) => setVotingSchedule(prev => ({
                                                ...prev,
                                                batchSize: Number(e.target.value)
                                            }))}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-700"
                                        />

                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>1</span>
                                            <span>50</span>
                                            <span>100</span>
                                        </div>
                                    </div>

                                    {/* Or type a number directly */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm text-gray-400 whitespace-nowrap">
                                            Or enter exact value:
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={votingSchedule.batchSize ?? 30}
                                            onChange={(e) => {
                                                const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                                                setVotingSchedule(prev => ({ ...prev, batchSize: val }));
                                            }}
                                            className="glass-input w-24 px-3 py-2 rounded-xl text-center text-white text-sm"
                                        />
                                        <span className="text-xs text-gray-500">ballots (max 100)</span>
                                    </div>

                                    {/* Info banner */}
                                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2 text-indigo-300 text-sm">
                                        <Info size={16} className="mt-0.5 shrink-0" />
                                        <span>
                                            Up to <strong>{votingSchedule.batchSize ?? 30}</strong> ballot submissions will be
                                            processed simultaneously
                                            {selectedClasses.length > 0
                                                ? <> for <strong>{selectedClasses.join(', ')}</strong></>
                                                : ' across all classes'
                                            }.
                                        </span>
                                    </div>

                                    {(votingSchedule.batchSize ?? 30) === 100 && (
                                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 text-orange-300 text-sm">
                                            <AlertTriangle size={16} />
                                            Maximum batch size selected. Ensure your server can handle the load.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Status Panel */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
                        <div className="mb-6 flex justify-center">
                            <LiveClock showIcon={true} />
                        </div>

                        <div className={`p-6 rounded-2xl mb-6 text-center border ${votingSchedule.isActive
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}>
                            <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${votingSchedule.isActive
                                ? 'bg-green-500 animate-pulse'
                                : 'bg-red-500'
                            }`} />
                            <h4 className={`text-lg font-bold ${votingSchedule.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                {votingSchedule.isActive ? 'VOTING ACTIVE' : 'VOTING CLOSED'}
                            </h4>
                            <p className="text-sm text-gray-400 mt-2">
                                {votingSchedule.isActive ? 'Students can cast votes' : 'Voting access is disabled'}
                            </p>
                        </div>

                        {/* Schedule summary */}
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
