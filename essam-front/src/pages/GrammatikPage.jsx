// src/pages/GrammatikPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGrammarTopics } from "../services/api";
import { useLevels } from "../hooks/useLevels";
import UserProfileDropdown from "../components/UserProfileDropdown";

// أيقونات افتراضية للمواضيع
const DEFAULT_ICONS = ["📚", "✏️", "📝", "🎯", "🔤", "📖", "🧩", "🔁", "🔗", "🧱"];

export default function GrammatikPage() {
  const { levelNames } = useLevels('grammatik');
  const [activeLevel, setActiveLevel] = useState("A1");
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTopics() {
      try {
        setLoading(true);
        setError("");

        const data = await getGrammarTopics(activeLevel, { provider: 'Grammatik' });

        // إضافة أيقونات للمواضيع
        const topicsWithIcons = (data.items || data || []).map((topic, idx) => ({
          ...topic,
          icon: DEFAULT_ICONS[idx % DEFAULT_ICONS.length],
        }));

        setTopics(topicsWithIcons);
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء تحميل مواضيع القواعد.");
      } finally {
        setLoading(false);
      }
    }

    loadTopics();
  }, [activeLevel]);

  const handleTopicClick = (topicSlug) => {
    // لاحقاً هنعمل صفحة لعرض القاعدة والتمارين
    navigate(`/grammatik/${activeLevel}/${topicSlug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* شريط أعلى بسيط */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← العودة للرئيسية
          </button>
          {localStorage.getItem("accessToken") ? (
            <UserProfileDropdown />
          ) : (
            <span className="text-xs font-semibold text-red-600">
              Deutsch Learning App
            </span>
          )}
        </div>

        {/* العنوان الرئيسي */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            القواعد <span className="text-red-600">Grammatik</span>
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            اختاري مستواك ثم موضوع القاعدة اللي حابة تتدربي عليه. بعد ما تفهمي
            القاعدة، تقدري تحلي تمارين عليها من نفس المكان. ✨
          </p>
        </div>

        {/* Tabs للمستويات */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {levelNames.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 text-sm rounded-full border transition ${
                activeLevel === level
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-red-500 hover:text-red-600"
              }`}
            >
              مستوى {level}
            </button>
          ))}
        </div>

        {/* عنوان فرعي للمستوى */}
        <div className="text-center mb-4">
          <p className="text-xs text-slate-500">
            يتم عرض مواضيع القواعد المناسبة لمستوى{" "}
            <span className="font-semibold text-slate-800">{activeLevel}</span>.
          </p>
        </div>

        {/* حالة التحميل */}
        {loading && (
          <div className="text-center text-slate-500 text-sm mt-10">
            جاري تحميل المواضيع…
          </div>
        )}

        {/* حالة الخطأ */}
        {error && !loading && (
          <div className="text-center text-red-600 text-sm mt-10 bg-red-50 border border-red-100 rounded-xl py-4">
            {error}
          </div>
        )}

        {/* كروت المواضيع */}
        {!loading && !error && topics.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-10">
            لا توجد مواضيع مضافة لهذا المستوى حتى الآن.
          </div>
        )}

        {!loading && !error && topics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <button
                key={topic.slug}
                type="button"
                onClick={() => handleTopicClick(topic.slug)}
                className="group text-right bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-xl">
                    {topic.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {topic.title}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      موضوع قواعد لمستوى {activeLevel}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  {topic.shortDescription || topic.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-red-600">
                  <span className="font-semibold group-hover:underline">
                    عرض القاعدة والتدريب
                  </span>
                  <span>↗</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
