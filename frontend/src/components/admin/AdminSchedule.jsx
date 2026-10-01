import React, { useMemo } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, RefreshCw, AlertTriangle, Info } from 'lucide-react';
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
    loadData
}) => {
    const start = votingSchedule.votingStart ? new Date(votingSchedule.votingStart) : null;
    const end = votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd) : null;
    const now = new Date();

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
    }, [votingSchedule.votingStart, votingSchedule.votingEnd]);

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
