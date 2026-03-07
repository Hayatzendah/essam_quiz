import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLevels } from "../../hooks/useLevels";
import {
  getNounsByLevel,
  getNounCounts,
  createNoun,
  createNounsBulk,
  updateNoun,
  deleteNoun,
} from "../../services/api";

export default function NounsManagement() {
  const { levelNames } = useLevels("derdiedas");
  const [activeLevel, setActiveLevel] = useState("A1");
  const [nouns, setNouns] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingNoun, setEditingNoun] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  // Form state
  const [formArticle, setFormArticle] = useState("der");
  const [formSingular, setFormSingular] = useState("");
  const [formPlural, setFormPlural] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNouns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNounsByLevel(activeLevel);
      setNouns(Array.isArray(data) ? data : []);
    } catch {
      setNouns([]);
    } finally {
      setLoading(false);
    }
  }, [activeLevel]);

  const loadCounts = useCallback(async () => {
    try {
      const data = await getNounCounts();
      setCounts(data || {});
    } catch {
      setCounts({});
    }
  }, []);

  useEffect(() => {
    loadNouns();
  }, [loadNouns]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const resetForm = () => {
    setFormArticle("der");
    setFormSingular("");
    setFormPlural("");
  };

  const handleAdd = async () => {
    if (!formSingular.trim() || !formPlural.trim()) return;
    setSaving(true);
    try {
      await createNoun({
        article: formArticle,
        singular: formSingular.trim(),
        plural: formPlural.trim(),
        level: activeLevel,
      });
      setShowAddModal(false);
      resetForm();
      loadNouns();
      loadCounts();
    } catch (err) {
      alert("حدث خطأ أثناء الإضافة");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingNoun || !formSingular.trim() || !formPlural.trim()) return;
    setSaving(true);
    try {
      await updateNoun(editingNoun._id || editingNoun.id, {
        article: formArticle,
        singular: formSingular.trim(),
        plural: formPlural.trim(),
      });
      setEditingNoun(null);
      resetForm();
      loadNouns();
    } catch (err) {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNoun(id);
      setDeleteConfirm(null);
      loadNouns();
      loadCounts();
    } catch {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setSaving(true);
    try {
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsed = [];
      for (const line of lines) {
        // Format: "das Haus / die Häuser"
        const parts = line.split("/").map((p) => p.trim());
        if (parts.length >= 2) {
          const singularPart = parts[0].split(/\s+/);
          const pluralPart = parts[1].split(/\s+/);

          if (singularPart.length >= 2 && pluralPart.length >= 2) {
            const article = singularPart[0].toLowerCase();
            const singular = singularPart.slice(1).join(" ");
            const plural = pluralPart.slice(1).join(" ");

            if (["der", "die", "das"].includes(article)) {
              parsed.push({ article, singular, plural });
            }
          }
        }
      }

      if (parsed.length === 0) {
        alert("لم يتم التعرف على أي كلمات. استخدم الصيغة: das Haus / die Häuser");
        setSaving(false);
        return;
      }

      await createNounsBulk(activeLevel, parsed);
      setShowBulkModal(false);
      setBulkText("");
      loadNouns();
      loadCounts();
    } catch {
      alert("حدث خطأ أثناء الاستيراد");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (noun) => {
    setFormArticle(noun.article);
    setFormSingular(noun.singular);
    setFormPlural(noun.plural);
    setEditingNoun(noun);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/welcome")}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة للوحة التحكم
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            إدارة Der / Die / Das
          </h1>
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {levelNames.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 text-sm rounded-full border transition ${
                activeLevel === level
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-purple-400"
              }`}
            >
              {level}
              {counts[level] !== undefined && (
                <span className="mr-1 text-xs opacity-75">
                  ({counts[level]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
          >
            + إضافة كلمة
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
          >
            استيراد جماعي
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
        ) : nouns.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            لا توجد كلمات لهذا المستوى
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" dir="rtl">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[30%]" />
                <col className="w-[30%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    الأداة
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    المفرد
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    الجمع
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {nouns.map((noun) => (
                  <tr
                    key={noun._id || noun.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="text-right px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          noun.article === "der"
                            ? "bg-blue-100 text-blue-700"
                            : noun.article === "die"
                            ? "bg-pink-100 text-pink-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {noun.article}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {noun.singular}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{noun.plural}</td>
                    <td className="text-right px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(noun)}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm(noun._id || noun.id)
                          }
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || editingNoun) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => {
                setShowAddModal(false);
                setEditingNoun(null);
                resetForm();
              }}
            />
            <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingNoun ? "تعديل كلمة" : "إضافة كلمة جديدة"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    الأداة
                  </label>
                  <select
                    value={formArticle}
                    onChange={(e) => setFormArticle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="der">der</option>
                    <option value="die">die</option>
                    <option value="das">das</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    المفرد
                  </label>
                  <input
                    type="text"
                    value={formSingular}
                    onChange={(e) => setFormSingular(e.target.value)}
                    placeholder="z.B. Haus"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    الجمع
                  </label>
                  <input
                    type="text"
                    value={formPlural}
                    onChange={(e) => setFormPlural(e.target.value)}
                    placeholder="z.B. Häuser"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingNoun ? handleEdit : handleAdd}
                  disabled={saving}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : editingNoun ? "حفظ التعديل" : "إضافة"}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingNoun(null);
                    resetForm();
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => {
                setShowBulkModal(false);
                setBulkText("");
              }}
            />
            <div className="relative bg-white rounded-xl shadow-lg max-w-lg w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                استيراد جماعي — مستوى {activeLevel}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                اكتب كلمة واحدة في كل سطر بالصيغة التالية:
                <br />
                <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                  das Haus / die Häuser
                </code>
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                dir="ltr"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder={`das Haus / die Häuser\nder Tisch / die Tische\ndie Lampe / die Lampen`}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkImport}
                  disabled={saving}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                >
                  {saving ? "جاري الاستيراد..." : "استيراد"}
                </button>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkText("");
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setDeleteConfirm(null)}
            />
            <div className="relative bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 p-6 text-center">
              <p className="text-lg font-bold text-slate-900 mb-2">
                هل أنت متأكد؟
              </p>
              <p className="text-sm text-slate-500 mb-6">
                سيتم حذف هذه الكلمة نهائياً
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition"
                >
                  حذف
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
