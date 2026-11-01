import React, { useState, useEffect } from 'react';
import { Venue } from '../../types/venue';
import { Promoter } from '../../types/promoter';
import { ConcertEvent } from '../../types/event';
import { fetchVenues } from '../../services/venueService';
import { fetchPromoters } from '../../services/promoterService';
import { fetchEvents } from '../../services/eventService';
import {
  parseCSV,
  validateVenuesCSV,
  validateEventsCSV,
  executeVenuesImport,
  executeEventsImport,
  deleteAllSampleData,
  VenuePreviewRow,
  EventPreviewRow,
} from '../../services/csvImportService';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';

interface CsvImportAdminProps {
  onDataChanged: () => void;
}

export const CsvImportAdmin: React.FC<CsvImportAdminProps> = ({ onDataChanged }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [events, setEvents] = useState<ConcertEvent[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Import sub-tab or section ('venues' | 'events')
  const [importType, setImportType] = useState<'venues' | 'events'>('venues');

  // Venue Import State
  const [venueFileText, setVenueFileText] = useState<string>('');
  const [venuePreviewRows, setVenuePreviewRows] = useState<VenuePreviewRow[]>([]);
  const [venueCounts, setVenueCounts] = useState({ valid: 0, duplicate: 0, error: 0 });
  const [isImportingVenues, setIsImportingVenues] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Event Import State
  const [eventFileText, setEventFileText] = useState<string>('');
  const [eventPreviewRows, setEventPreviewRows] = useState<EventPreviewRow[]>([]);
  const [newPromotersMap, setNewPromotersMap] = useState<Map<string, string>>(new Map());
  const [eventCounts, setEventCounts] = useState({ valid: 0, duplicate: 0, error: 0 });
  const [isImportingEvents, setIsImportingEvents] = useState(false);

  // SAMPLE Cleanup State
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingSample, setIsDeletingSample] = useState(false);

  // Load existing data once when tab mounts (keeping reads low)
  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const [vList, pList, eList] = await Promise.all([
        fetchVenues(),
        fetchPromoters(),
        fetchEvents(),
      ]);
      setVenues(vList || []);
      setPromoters(pList || []);
      setEvents(eList || []);
    } catch (err: any) {
      console.error('Error loading reference data for import:', err);
      setErrorMessage(err?.message || 'Failed to load database reference records.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- Template Downloads ---
  const downloadVenuesTemplate = () => {
    const csvContent =
      '\uFEFFname,lat,lng,address,igUrl,mapsUrl\n' +
      'SAMPLE Livehouse Bangkok,13.7500,100.5000,123 Rama I Rd Pathum Wan Bangkok,https://instagram.com/samplelivehouse,https://maps.app.goo.gl/sample';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'venues_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEventsTemplate = () => {
    const csvContent =
      '\uFEFFtitle,artists,venueName,promoterName,startAt,priceText,genres,ticketUrl,igPostUrl,status\n' +
      'SAMPLE Indie Showcase,Band A|Band B,SAMPLE Livehouse Bangkok,SAMPLE Promoter,2026-12-31 20:00,350 THB,Indie Rock|Shoegaze,https://ticketmelon.com/sample,https://instagram.com/p/sample,available';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'events_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Handle Venues File Upload ---
  const handleVenueFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSV(text);
      if (parsed.length > 501) {
        setErrorMessage('File exceeds maximum limit of 500 rows.');
        return;
      }
      const result = validateVenuesCSV(parsed, venues);
      setVenuePreviewRows(result.rows);
      setVenueCounts({
        valid: result.validCount,
        duplicate: result.duplicateCount,
        error: result.errorCount,
      });
      setVenueFileText(text);
    };
    reader.onerror = () => setErrorMessage('Failed to read CSV file.');
    reader.readAsText(file, 'UTF-8');
  };

  // --- Handle Events File Upload ---
  const handleEventFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseCSV(text);
      if (parsed.length > 501) {
        setErrorMessage('File exceeds maximum limit of 500 rows.');
        return;
      }
      const result = validateEventsCSV(parsed, venues, promoters, events);
      setEventPreviewRows(result.rows);
      setNewPromotersMap(result.newPromotersMap);
      setEventCounts({
        valid: result.validCount,
        duplicate: result.duplicateCount,
        error: result.errorCount,
      });
      setEventFileText(text);
    };
    reader.onerror = () => setErrorMessage('Failed to read CSV file.');
    reader.readAsText(file, 'UTF-8');
  };

  // --- Confirm Venue Import ---
  const handleConfirmVenueImport = async () => {
    const validRows = venuePreviewRows.filter((r) => r.status === 'ok');
    if (validRows.length === 0) return;

    setIsImportingVenues(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportProgress({ current: 0, total: validRows.length });

    try {
      const count = await executeVenuesImport(validRows, (curr, total) => {
        setImportProgress({ current: curr, total });
      });
      setSuccessMessage(`Successfully imported ${count} venues!`);
      setVenuePreviewRows([]);
      setVenueFileText('');
      await loadBaseData();
      onDataChanged();
    } catch (err: any) {
      console.error('Venue import error:', err);
      setErrorMessage(err?.message || 'Failed to import venues.');
    } finally {
      setIsImportingVenues(false);
    }
  };

  // --- Confirm Event Import ---
  const handleConfirmEventImport = async () => {
    const validRows = eventPreviewRows.filter((r) => r.status === 'ok');
    if (validRows.length === 0) return;

    setIsImportingEvents(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportProgress({ current: 0, total: validRows.length });

    try {
      const res = await executeEventsImport(
        validRows,
        venues,
        promoters,
        newPromotersMap,
        (curr, total) => {
          setImportProgress({ current: curr, total });
        }
      );
      setSuccessMessage(
        `Successfully imported ${res.eventsImported} events and created ${res.promotersCreated} new promoters!`
      );
      setEventPreviewRows(undefined as any);
      setEventFileText('');
      await loadBaseData();
      onDataChanged();
    } catch (err: any) {
      console.error('Event import error:', err);
      setErrorMessage(err?.message || 'Failed to import events.');
    } finally {
      setIsImportingEvents(false);
    }
  };

  // --- SAMPLE Cleanup Execution ---
  const handleExecuteCleanup = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setIsDeletingSample(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const summary = await deleteAllSampleData();
      setSuccessMessage(
        `Deleted SAMPLE data successfully: ${summary.venuesDeleted} venues, ${summary.promotersDeleted} promoters, ${summary.eventsDeleted} events, and ${summary.reportsDeleted} reports.`
      );
      setIsCleanupModalOpen(false);
      setDeleteConfirmationText('');
      await loadBaseData();
      onDataChanged();
    } catch (err: any) {
      console.error('Cleanup error:', err);
      setErrorMessage(err?.message || 'Failed to delete SAMPLE data.');
    } finally {
      setIsDeletingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Cleanup & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-lime-400" />
            <span>CSV Import & Data Management</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Bulk import Venues or Events via CSV (UTF-8, max 500 rows). Preview before writing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBaseData}
            disabled={isLoadingData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCleanupModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-200 text-xs font-mono transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete all SAMPLE data</span>
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section Switcher: Venues vs Events */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setImportType('venues')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
            importType === 'venues'
              ? 'bg-lime-400 text-black shadow-md'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Venues CSV Import
        </button>
        <button
          type="button"
          onClick={() => setImportType('events')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
            importType === 'events'
              ? 'bg-lime-400 text-black shadow-md'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Events CSV Import
        </button>
      </div>

      {/* ==================== VENUES IMPORT SECTION ==================== */}
      {importType === 'venues' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-mono mb-1">
                Venues CSV Format & Validation
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Columns required: <code className="text-lime-400">name, lat, lng, address, igUrl, mapsUrl</code>.<br />
                Lat (13.40 to 14.30), Lng (100.20 to 100.95). mapsUrl required. Duplicates by name are skipped.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadVenuesTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-lime-400" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Picker */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-dashed border-neutral-700 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Upload className="w-6 h-6 text-lime-400" />
            </div>
            <div>
              <label className="inline-block cursor-pointer">
                <span className="text-xs font-bold text-lime-400 hover:underline">
                  Choose CSV file
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleVenueFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-neutral-400 ml-1">(.csv, UTF-8, max 500 rows)</span>
            </div>
          </div>

          {/* Preview Table */}
          {venuePreviewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <span className="text-white">Total: {venuePreviewRows.length}</span>
                  <span className="text-emerald-400">Valid: {venueCounts.valid}</span>
                  <span className="text-amber-400">Duplicates: {venueCounts.duplicate}</span>
                  <span className="text-red-400">Errors: {venueCounts.error}</span>
                </div>

                <button
                  type="button"
                  disabled={venueCounts.valid === 0 || isImportingVenues}
                  onClick={handleConfirmVenueImport}
                  className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isImportingVenues ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        Importing ({importProgress.current}/{importProgress.total})...
                      </span>
                    </>
                  ) : (
                    <span>Confirm Import ({venueCounts.valid} valid rows)</span>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono">
                      <th className="p-3">Row</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Coordinates</th>
                      <th className="p-3">Address</th>
                      <th className="p-3">Details / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {venuePreviewRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono text-neutral-400">#{r.rowNumber}</td>
                        <td className="p-3">
                          {r.status === 'ok' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                              OK
                            </span>
                          )}
                          {r.status === 'duplicate' && (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px]">
                              DUPLICATE
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono text-[10px]">
                              ERROR
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{r.name}</td>
                        <td className="p-3 font-mono text-neutral-300">
                          {r.lat}, {r.lng}
                        </td>
                        <td className="p-3 text-neutral-300 max-w-xs truncate">{r.address}</td>
                        <td className="p-3 text-neutral-400 text-[11px]">{r.reason || 'Ready to import'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== EVENTS IMPORT SECTION ==================== */}
      {importType === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-mono mb-1">
                Events CSV Format & Validation
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Columns required: <code className="text-lime-400">title, artists (|), venueName, promoterName, startAt (YYYY-MM-DD HH:mm), priceText, genres (|), ticketUrl, igPostUrl, status</code>.<br />
                Venue must exist. Unknown promoters will be created with verified=false.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadEventsTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-lime-400" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Picker */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-dashed border-neutral-700 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Upload className="w-6 h-6 text-lime-400" />
            </div>
            <div>
              <label className="inline-block cursor-pointer">
                <span className="text-xs font-bold text-lime-400 hover:underline">
                  Choose CSV file
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleEventFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-neutral-400 ml-1">(.csv, UTF-8, max 500 rows)</span>
            </div>
          </div>

          {/* Preview Table */}
          {eventPreviewRows && eventPreviewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <span className="text-white">Total: {eventPreviewRows.length}</span>
                  <span className="text-emerald-400">Valid: {eventCounts.valid}</span>
                  <span className="text-amber-400">Duplicates: {eventCounts.duplicate}</span>
                  <span className="text-red-400">Errors: {eventCounts.error}</span>
                  {newPromotersMap.size > 0 && (
                    <span className="text-lime-400">New Promoters to create: {newPromotersMap.size}</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={eventCounts.valid === 0 || isImportingEvents}
                  onClick={handleConfirmEventImport}
                  className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isImportingEvents ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        Importing ({importProgress.current}/{importProgress.total})...
                      </span>
                    </>
                  ) : (
                    <span>Confirm Import ({eventCounts.valid} valid rows)</span>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono">
                      <th className="p-3">Row</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Venue</th>
                      <th className="p-3">Start (Bangkok)</th>
                      <th className="p-3">Details / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {eventPreviewRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono text-neutral-400">#{r.rowNumber}</td>
                        <td className="p-3">
                          {r.status === 'ok' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                              OK
                            </span>
                          )}
                          {r.status === 'duplicate' && (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px]">
                              DUPLICATE
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono text-[10px]">
                              ERROR
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-white">{r.title}</td>
                        <td className="p-3 text-neutral-300">{r.venueName}</td>
                        <td className="p-3 font-mono text-neutral-300">{r.startAtIso}</td>
                        <td className="p-3 text-neutral-400 text-[11px]">{r.reason || 'Ready to import'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== DELETE SAMPLE DATA MODAL ==================== */}
      {isCleanupModalOpen && (
        <div className="fixed inset-0 z-1250 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-red-900/60 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete All SAMPLE Data</h3>
                <p className="text-xs text-neutral-400">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              This will permanently delete all venues, promoters, and events whose name or title starts with <strong className="text-white font-mono">"SAMPLE"</strong> (case-insensitive), plus all crowd reports associated with those sample events.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-300">
                Type <code className="text-red-400 font-mono font-bold">DELETE</code> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCleanupModalOpen(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteConfirmationText !== 'DELETE' || isDeletingSample}
                onClick={handleExecuteCleanup}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {isDeletingSample && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Sample Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
