import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    X, Upload, CheckCircle, AlertTriangle, AlertCircle,
    Eye, EyeOff, Users, FileSpreadsheet, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateVoterId } from '../../utils/studentName.js';

// ── helpers (mirrored from AdminDashboard) ────────────────────────────────────
const normalize  = (key) => key.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
const generatePassword = (name) => {
    const letters = (name || '').replace(/[^a-zA-Z]/g, '').toLowerCase().substring(0, 4).padEnd(4, 'x');
    const digits  = Math.floor(1000 + Math.random() * 9000).toString();
    return letters + digits;
};

const parseSheet = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(e.target.result, { type: 'array' });
            const sheet    = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (!rawRows.length) { resolve([]); return; }

            const keyMap = {};
            Object.keys(rawRows[0]).forEach(k => { keyMap[normalize(k)] = k; });

            const getField = (row, ...variants) => {
                for (const v of variants) {
                    const raw = keyMap[normalize(v)];
                    if (raw !== undefined && row[raw] !== undefined && row[raw] !== '')
                        return String(row[raw]).trim();
                }
                return '';
            };

            const reservedVoterIds = new Set();
            const parsed = rawRows.map((row, idx) => {
                const studentId    = getField(row, 'studentId','student_id','studentid','id','roll','rollno','rollnumber','enrollment');
                const name         = getField(row, 'name','studentname','student_name','fullname','full_name');
                const sheetVoterId = getField(row, 'voterId','voter_id','voterid','voter');
                const voterId      = sheetVoterId ? sheetVoterId.toUpperCase() : generateVoterId(reservedVoterIds);
                const sheetPwd     = getField(row, 'password','pass','passwd');
                const password     = sheetPwd || generatePassword(name);
                const studentClass = getField(row, 'class','studentclass','branch','department','dept') || 'Unknown';
                const semester     = getField(row, 'semester','sem','year') || 'Semester 1';

                const errors = [];
                if (!studentId) errors.push('Missing Student ID');
                if (!name)      errors.push('Missing Name');

                return {
                    _rowIdx: idx,
                    studentId,
                    voterId,
                    name,
                    password,
                    class: studentClass,
                    semester,
                    errors,
                    selected: errors.length === 0,
                    _autoVoterId: !sheetVoterId,
                    _autoPassword: !sheetPwd
                };
            });

            resolve(parsed);
        } catch (err) {
            reject(err);
        }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
});

// ── Main Modal ────────────────────────────────────────────────────────────────
const ImportPreviewModal = ({ isOpen, onClose, onConfirm, existingStudentIds = [] }) => {
    const [rows, setRows]             = useState([]);
    const [fileName, setFileName]     = useState('');
    const [parsing, setParsing]       = useState(false);
    const [parseError, setParseError] = useState('');
    const [showPwd, setShowPwd]       = useState(false);
    const [sortField, setSortField]   = useState('');
    const [sortAsc, setSortAsc]       = useState(true);
    const [search, setSearch]         = useState('');

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setRows([]); setFileName(''); setParseError(''); setSearch(''); setShowPwd(false);
        }
    }, [isOpen]);

    const handleFile = useCallback(async (file) => {
        if (!file) return;
        setParsing(true);
        setParseError('');
        setFileName(file.name);
        try {
            const parsed = await parseSheet(file);
            if (!parsed.length) { setParseError('The file has no data rows.'); setParsing(false); return; }

            // Mark duplicates against existing registry
            const withDups = parsed.map(r => ({
                ...r,
                isDuplicate: existingStudentIds.includes(r.studentId),
                errors: r.errors.concat(existingStudentIds.includes(r.studentId) ? ['Already exists in registry'] : [])
            }));
            // Auto-deselect invalid/duplicate rows
            const withSel = withDups.map(r => ({ ...r, selected: r.errors.length === 0 }));
            setRows(withSel);
        } catch {
            setParseError('Failed to read the file. Make sure it is a valid .xlsx or .csv file.');
        }
        setParsing(false);
    }, [existingStudentIds]);

    const toggleRow = (idx) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
    const toggleAll = () => {
        const validRows = rows.filter(r => r.errors.length === 0);
        const allSelected = validRows.every(r => r.selected);
        setRows(prev => prev.map(r => r.errors.length === 0 ? { ...r, selected: !allSelected } : r));
    };

    const handleSort = (field) => {
        if (sortField === field) setSortAsc(a => !a);
        else { setSortField(field); setSortAsc(true); }
    };

    const displayRows = [...rows]
        .filter(r =>
            !search ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.studentId.toLowerCase().includes(search.toLowerCase()) ||
            r.class.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (!sortField) return 0;
            const va = (a[sortField] || '').toLowerCase();
            const vb = (b[sortField] || '').toLowerCase();
            return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        });

    const selectedRows  = rows.filter(r => r.selected);
    const invalidRows   = rows.filter(r => r.errors.length > 0);
    const duplicateRows = rows.filter(r => r.isDuplicate);
    const validCount    = rows.filter(r => r.errors.length === 0).length;

    const handleConfirm = () => {
        if (!selectedRows.length) return;
        onConfirm(selectedRows);
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronDown size={12} className="opacity-30" />;
        return sortAsc ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet size={20} className="text-indigo-400" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Import Preview</h2>
                            {fileName && <p className="text-xs text-gray-400 mt-0.5">{fileName}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Drop zone or stats bar */}
                {!rows.length && !parsing ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
                        <label className="flex flex-col items-center gap-4 cursor-pointer group">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/40 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                                <Upload size={32} className="text-indigo-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-semibold">Drop your file here or click to browse</p>
                                <p className="text-gray-400 text-sm mt-1">Accepts .xlsx, .xls, .csv</p>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                            />
                        </label>
                        {parseError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                                <AlertCircle size={16} /> {parseError}
                            </div>
                        )}
                    </div>
                ) : parsing ? (
                    <div className="flex-1 flex items-center justify-center gap-3 text-gray-400">
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        Parsing file…
                    </div>
                ) : (
                    <>
                        {/* Stats bar */}
                        <div className="px-6 py-3 bg-white/3 border-b border-white/10 shrink-0">
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-300">
                                    <Users size={14} className="text-indigo-400" />
                                    <strong className="text-white">{rows.length}</strong> rows parsed
                                </span>
                                <span className="flex items-center gap-1.5 text-green-300">
                                    <CheckCircle size={14} />
                                    <strong>{validCount}</strong> valid
                                </span>
                                {invalidRows.length > 0 && (
                                    <span className="flex items-center gap-1.5 text-red-400">
                                        <AlertCircle size={14} />
                                        <strong>{invalidRows.length}</strong> invalid
                                    </span>
                                )}
                                {duplicateRows.length > 0 && (
                                    <span className="flex items-center gap-1.5 text-amber-400">
                                        <AlertTriangle size={14} />
                                        <strong>{duplicateRows.length}</strong> duplicates
                                    </span>
                                )}
                                <span className="ml-auto flex items-center gap-1.5 text-indigo-300 font-semibold">
                                    <CheckCircle size={14} />
                                    {selectedRows.length} selected for import
                                </span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-3 border-b border-white/10 shrink-0">
                            <input
                                type="text"
                                placeholder="Search by name, ID or class…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="glass-input w-full px-4 py-2 rounded-xl text-sm"
                            />
                        </div>

                        {/* Table */}
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 bg-[#0f172a] border-b border-white/10 z-10">
                                    <tr className="text-gray-400">
                                        <th className="p-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={validCount > 0 && rows.filter(r => r.errors.length === 0).every(r => r.selected)}
                                                onChange={toggleAll}
                                                className="h-4 w-4 rounded border-gray-600 text-indigo-600 bg-gray-700 cursor-pointer"
                                            />
                                        </th>
                                        {[
                                            { key: 'studentId', label: 'Student ID' },
                                            { key: 'voterId',   label: 'Voter ID' },
                                            { key: 'name',      label: 'Name' },
                                            { key: 'class',     label: 'Class' },
                                            { key: 'semester',  label: 'Semester' },
                                            { key: 'password',  label: 'Password' },
                                        ].map(col => (
                                            <th
                                                key={col.key}
                                                className="p-3 font-medium text-left cursor-pointer select-none hover:text-white transition-colors"
                                                onClick={() => col.key !== 'password' && handleSort(col.key)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    {col.key !== 'password' && <SortIcon field={col.key} />}
                                                    {col.key === 'password' && (
                                                        <button
                                                            type="button"
                                                            onClick={e => { e.stopPropagation(); setShowPwd(v => !v); }}
                                                            className="ml-1 text-gray-500 hover:text-gray-300 transition-colors"
                                                        >
                                                            {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-3 font-medium text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {displayRows.map((row, i) => {
                                        const hasError = row.errors.length > 0;
                                        return (
                                            <tr
                                                key={row._rowIdx}
                                                className={`transition-colors ${
                                                    hasError
                                                        ? 'bg-red-500/5 text-gray-500'
                                                        : row.selected
                                                        ? 'bg-indigo-500/5 hover:bg-indigo-500/10 text-gray-200'
                                                        : 'hover:bg-white/5 text-gray-400'
                                                }`}
                                            >
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.selected}
                                                        disabled={hasError}
                                                        onChange={() => toggleRow(rows.indexOf(row))}
                                                        className="h-4 w-4 rounded border-gray-600 text-indigo-600 bg-gray-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="p-3 font-mono text-xs font-medium text-white/80">{row.studentId || <span className="text-red-400 italic">missing</span>}</td>
                                                <td className="p-3 font-mono text-xs font-semibold text-indigo-300">{row.voterId}</td>
                                                <td className="p-3 font-medium">{row.name || <span className="text-red-400 italic">missing</span>}</td>
                                                <td className="p-3">{row.class}</td>
                                                <td className="p-3">{row.semester}</td>
                                                <td className="p-3 font-mono text-xs">
                                                    {showPwd
                                                        ? <span className="text-amber-300">{row.password}</span>
                                                        : <span className="text-gray-500 tracking-widest">••••••••</span>
                                                    }
                                                </td>
                                                <td className="p-3">
                                                    {hasError ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {row.errors.map((e, ei) => (
                                                                <span key={ei} className="flex items-center gap-1 text-xs text-red-400">
                                                                    <AlertCircle size={11} /> {e}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : row.selected ? (
                                                        <span className="flex items-center gap-1 text-xs text-green-400">
                                                            <CheckCircle size={11} /> Ready
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">Skipped</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {displayRows.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">No rows match your search.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 bg-white/5 shrink-0 flex items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                        {rows.length > 0
                            ? `${selectedRows.length} of ${rows.length} rows will be imported`
                            : 'Select a file to preview'}
                    </div>
                    <div className="flex items-center gap-3">
                        {rows.length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                <Upload size={13} />
                                Change file
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={(e) => { setRows([]); e.target.files[0] && handleFile(e.target.files[0]); }}
                                />
                            </label>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedRows.length}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                                selectedRows.length
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Upload size={15} />
                            Import {selectedRows.length > 0 ? `${selectedRows.length} Students` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
