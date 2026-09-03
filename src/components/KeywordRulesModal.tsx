import React, { useState } from 'react';
import { X, Tag, Plus, Trash2, Edit2, Check, Sparkles } from 'lucide-react';
import { Bucket, KeywordRule } from '../types';

interface KeywordRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: KeywordRule[];
  buckets: Bucket[];
  onAddRule: (rule: Omit<KeywordRule, 'id'>) => void;
  onUpdateRule: (rule: KeywordRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

export const KeywordRulesModal: React.FC<KeywordRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  buckets,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newBucketId, setNewBucketId] = useState(buckets[0]?.id || '');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editBucketId, setEditBucketId] = useState('');

  if (!isOpen) return null;

  const bucketMap = new Map<string, Bucket>(buckets.map((b) => [b.id, b]));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newBucketId) return;

    onAddRule({
      keyword: newKeyword.trim().toLowerCase(),
      bucketId: newBucketId,
      priority: 1,
    });

    setNewKeyword('');
  };

  const startEdit = (rule: KeywordRule) => {
    setEditingRuleId(rule.id);
    setEditKeyword(rule.keyword);
    setEditBucketId(rule.bucketId);
  };

  const saveEdit = (ruleId: string) => {
    if (!editKeyword.trim() || !editBucketId) return;
    onUpdateRule({
      id: ruleId,
      keyword: editKeyword.trim().toLowerCase(),
      bucketId: editBucketId,
      priority: 1,
    });
    setEditingRuleId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                CSV Keyword Auto-Categorization Rules
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically maps bank statement narration keywords to target buckets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add Rule Form */}
          <form
            onSubmit={handleAdd}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center gap-2.5"
          >
            <div className="flex-1 min-w-40">
              <label className="text-[11px] text-zinc-400 block mb-1">
                Statement Keyword (Substring)
              </label>
              <input
                type="text"
                placeholder="e.g. swiggy, uber, zomato"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="flex-1 min-w-44">
              <label className="text-[11px] text-zinc-400 block mb-1">
                Target Envelope / Bucket
              </label>
              <select
                value={newBucketId}
                onChange={(e) => setNewBucketId(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type === 'recurring' ? 'Recurring' : 'Goal'})
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-5">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>
          </form>

          {/* Rules Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Keyword Match</th>
                  <th className="py-2.5 px-4">Mapped Bucket Envelope</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-500">
                      No keyword rules defined yet.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const isEditing = editingRuleId === rule.id;
                    const bucket = bucketMap.get(rule.bucketId);

                    return (
                      <tr key={rule.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-zinc-200">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editKeyword}
                              onChange={(e) => setEditKeyword(e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-amber-300 font-mono">
                              "{rule.keyword}"
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isEditing ? (
                            <select
                              value={editBucketId}
                              onChange={(e) => setEditBucketId(e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              {buckets.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          ) : bucket ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                              style={{
                                backgroundColor: `${bucket.color}15`,
                                color: bucket.color,
                                border: `1px solid ${bucket.color}35`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: bucket.color }}
                              />
                              {bucket.name}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Missing Bucket</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-2">
                          {isEditing ? (
                            <button
                              onClick={() => saveEdit(rule.id)}
                              className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => startEdit(rule)}
                              className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
                              title="Edit rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteRule(rule.id)}
                            className="text-zinc-400 hover:text-rose-400 p-1 cursor-pointer"
                            title="Delete rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end bg-zinc-950">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
