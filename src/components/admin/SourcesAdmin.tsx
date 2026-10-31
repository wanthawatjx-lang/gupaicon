import React, { useState, useEffect } from 'react';
import { Source, SourceFormData, SourceType } from '../../types/source';
import { Venue } from '../../types/venue';
import { subscribeToSources, createSource, updateSource, deleteSource, seedSampleSources } from '../../services/sourceService';
import { Language, translations } from '../../i18n';
import { Plus, Trash2, Edit, Check, X, Database, Globe, Search, Tag, MapPin } from 'lucide-react';

interface SourcesAdminProps {
  venues: Venue[];
  lang: Language;
}

export const SourcesAdmin: React.FC<SourcesAdminProps> = ({ venues, lang }) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SourceFormData>({
    name: '',
    type: 'search_query',
    value: '',
    venueId: '',
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSources(
      (data) => {
        setSources(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'search_query',
      value: '',
      venueId: '',
      active: true,
    });
    setIsFormOpen(true);
    setError(null);
  };

  const handleOpenEdit = (src: Source) => {
    setEditingId(src.id);
    setFormData({
      name: src.name,
      type: src.type,
      value: src.value,
      venueId: src.venueId || '',
      active: src.active,
    });
    setIsFormOpen(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.value.trim()) {
      setError('Name and value are required.');
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await updateSource(editingId, formData);
        setSuccess('Source updated successfully.');
      } else {
        await createSource(formData);
        setSuccess('Source created successfully.');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save source.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    try {
      await deleteSource(id);
      setSuccess('Source deleted.');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete source.');
    }
  };

  const handleToggleActive = async (src: Source) => {
    try {
      await updateSource(src.id, { active: !src.active });
    } catch (err: any) {
      setError(err?.message || 'Failed to update active status.');
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      const count = await seedSampleSources();
      setSuccess(`Seeded ${count} sample sources successfully!`);
    } catch (err: any) {
      setError(err?.message || 'Failed to seed sample sources.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">AI Discovery Sources</h2>
          <p className="text-sm text-neutral-400">Manage search queries and target URLs used for automated event discovery.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Database className="w-4 h-4 text-lime-400" />
            {isSeeding ? 'Seeding...' : 'Seed Sample Sources'}
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-lime-400/20"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-300 text-sm rounded-xl">{error}</div>}
      {success && <div className="p-3 bg-lime-950/50 border border-lime-500/30 text-lime-300 text-sm rounded-xl">{success}</div>}

      {/* Sources List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 font-mono text-sm">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">No discovery sources configured yet. Add one or seed sample sources.</div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {sources.map((src) => {
              const venue = venues.find((v) => v.id === src.venueId);
              return (
                <div key={src.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-neutral-850 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${src.active ? 'bg-lime-400 shadow-sm shadow-lime-400' : 'bg-neutral-600'}`} />
                      <h3 className="text-base font-bold text-white">{src.name}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs uppercase">
                        {src.type}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-neutral-300 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 break-all">
                      {src.value}
                    </p>
                    {venue && (
                      <div className="flex items-center gap-1 text-xs text-lime-400 font-medium">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Venue target: {venue.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(src)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                        src.active
                          ? 'bg-lime-950/50 border-lime-500/30 text-lime-400 hover:bg-lime-900/50'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {src.active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(src)}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(src.id)}
                      className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Source Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-1100 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Source' : 'Add Discovery Source'}</h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">Source Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bangkok Indie Rock Gigs"
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">Source Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as SourceType })}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400 font-medium"
                >
                  <option value="search_query">Search Query (Search phrase for AI)</option>
                  <option value="ticket_page">Ticket Page URL</option>
                  <option value="venue_site">Venue Site URL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  {formData.type === 'search_query' ? 'Search Phrase / Keywords' : 'Target URL'}
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'search_query' ? 'e.g. indie rock concerts bangkok livehouse 2026' : 'https://...'}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400 font-medium resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">Target Venue (Optional)</label>
                <select
                  value={formData.venueId || ''}
                  onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400 font-medium"
                >
                  <option value="">-- No specific venue (General Bangkok/Pathum Thani) --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-lime-400 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="active-checkbox" className="text-sm font-medium text-white cursor-pointer">
                  Active (Included in AI discovery runs)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-lg shadow-lime-400/20"
                >
                  {editingId ? 'Save Changes' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
