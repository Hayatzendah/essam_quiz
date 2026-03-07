import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLevels } from "../hooks/useLevels";
import { getNounCounts } from "../services/api";


export default function DerDieDasPage() {
  const { levelNames } = useLevels("derdiedas");
  const [activeLevel, setActiveLevel] = useState("A1");
  const [counts, setCounts] = useState({});
  const [showCountPicker, setShowCountPicker] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isTeacher = user.role === "admin" || user.role === "teacher";

  useEffect(() => {
    if (isTeacher) {
      getNounCounts()
        .then((data) => setCounts(data || {}))
        .catch(() => setCounts({}));
    }
  }, [isTeacher]);

  const handleLevelClick = (level) => {
    setActiveLevel(level);
    setShowCountPicker(true);
  };

  const handleStartQuiz = (count) => {
    navigate(`/derdiedas/quiz/${activeLevel}?count=${count}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة للرئيسية
          </button>
          <span className="text-xs font-semibold text-purple-600">
            Deutsch Learning App
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            أدوات التعريف{" "}
            <span className="text-purple-600">Der / Die / Das</span>
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            اختر المستوى وعدد الكلمات، ثم ابدأ التدريب على أدوات التعريف
            الألمانية. اختر الأداة الصحيحة لكل كلمة!
          </p>
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {levelNames.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleLevelClick(level)}
              className={`px-4 py-2 text-sm rounded-full border transition ${
                activeLevel === level && showCountPicker
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-purple-500 hover:text-purple-600"
              }`}
            >
              مستوى {level}
              {isTeacher && counts[level] !== undefined && (
                <span className="mr-1 text-xs opacity-75">
                  ({counts[level]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Count Picker */}
        {showCountPicker && (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              مستوى {activeLevel}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              كم كلمة تريد التدرب عليها؟
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[5, 10, 20, 30].map((count) => (
                <button
                  key={count}
                  onClick={() => handleStartQuiz(count)}
                  className="py-3 px-4 rounded-xl border-2 border-purple-200 text-purple-700 font-bold text-lg hover:bg-purple-50 hover:border-purple-400 transition"
                >
                  {count} كلمة
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hint when no level selected */}
        {!showCountPicker && (
          <div className="text-center text-slate-400 text-sm mt-10">
            اختر مستوى للبدء
          </div>
        )}
      </div>
    </div>
  );
}
