import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPublicExams, getProviderSkills } from "../services/api";
import { useLevels } from "../hooks/useLevels";
import UserProfileDropdown from "../components/UserProfileDropdown";

const PROVIDERS = [
  {
    id: "goethe",
    name: "Goethe-Institut",
    icon: "🎓",
    levels: "A1 – C1",
    allowedLevels: ["A1", "A2", "B1", "B2", "C1"],
    description:
      "امتحانات معترف فيها عالميًا، مناسبة للدراسة، العمل، والهجرة. بتلاقي نماذج وتدريبات لكل مستوى مع شرح لطريقة الامتحان."
  },
  {
    id: "telc",
    name: "telc",
    icon: "📋",
    levels: "A1 – C1",
    allowedLevels: ["A1", "A2", "B1", "B2", "C1"],
    description:
      "امتحانات تركّز على اللغة في الحياة اليومية والعمل، وفي نماذج خاصة للمهاجرين وللشهادات المهنية."
  },
  {
    id: "oesd",
    name: "ÖSD",
    icon: "🏛️",
    levels: "A1 – C1",
    allowedLevels: ["A1", "A2", "B1", "B2", "C1"],
    description:
      "نظام امتحانات نمساوي، مناسب للدراسة والعمل في ألمانيا والنمسا وسويسرا، مع تركيز قوي على الفهم والتعبير."
  },
  {
    id: "dtb",
    name: "DTB",
    icon: "💼",
    levels: "A2 – C1",
    allowedLevels: ["A2", "B1", "B2", "C1"],
    description:
      "امتحانات لغة مهنية مخصّصة للعمل في ألمانيا، مع تركيز على مفردات ومواقف من بيئة الشغل."
  },
  {
    id: "dtz",
    name: "DTZ",
    icon: "🏠",
    levels: "B1",
    allowedLevels: ["B1"],
    description:
      "امتحان مخصص للمهاجرين وبرامج الاندماج، مناسب للحصول على الإقامة الدائمة أو الجنسية."
  },
  {
    id: "ecl",
    name: "ECL",
    icon: "🇪🇺",
    levels: "A2 – C1",
    allowedLevels: ["A2", "B1", "B2", "C1"],
    description:
      "نظام امتحانات أوروبي يركّز على التواصل العملي في المواقف اليومية والرسمية، مع تقييم واضح لكل مهارة."
  }
];

const EXAM_SKILLS = [
  {
    id: "hoeren",
    title: "Hören – الاستماع",
    icon: "🎧",
    description:
      "بتسمعي محادثات، إعلانات، رسائل صوتية أو حوارات، وبتجاوبي على أسئلة اختيار من متعدد أو صح/خطأ. في العادة بيكون في 2–3 Teile داخل قسم الاستماع."
  },
  {
    id: "lesen",
    title: "Lesen – القراءة",
    icon: "📖",
    description:
      "نصوص من الحياة اليومية، رسائل، إيميلات، أو مقالات قصيرة. الأسئلة بتكون اختيار من متعدد، مطابقة، أو تعبئة فراغات، وغالبًا 3–4 Teile حسب نوع الامتحان."
  },
  {
    id: "schreiben",
    title: "Schreiben – الكتابة",
    icon: "✍️",
    description:
      "كتابة رسالة، إيميل، أو نص قصير حسب المستوى. أحيانًا Teil واحد أو اثنين، مع نقاط لازم تغطيها في الإجابة عشان تاخدي العلامة الكاملة."
  },
  {
    id: "sprechen",
    title: "Sprechen – المحادثة",
    icon: "💬",
    description:
      "محادثة مع الممتحِن أو متقدّم ثاني، فيها تعارف بسيط، وصف صور، أو نقاش حول موضوع معيّن، وغالبًا مقسومة إلى 2–3 Teile."
  },
  {
    id: "sprachbausteine",
    title: "Sprachbausteine – القواعد اللغوية",
    icon: "🧩",
    description:
      "تمارين لاختيار الكلمة أو التركيب الصحيح ضمن نص أو جمل، وبتركّز على القواعد والمفردات والتراكيب اللغوية."
  }
];

export default function PruefungenPage() {
  const { levelNames } = useLevels('pruefungen');
  const [activeLevel, setActiveLevel] = useState("A1");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Load skills when provider is selected (or level changes)
  useEffect(() => {
    if (selectedProvider && !selectedSkill) {
      loadSkills();
    }
  }, [activeLevel, selectedProvider]);

  // Load exams when skill is selected
  useEffect(() => {
    if (selectedProvider && selectedSkill) {
      loadExams();
    }
  }, [activeLevel, selectedProvider, selectedSkill]);

  const loadSkills = async () => {
    try {
      setLoadingSkills(true);
      setError("");
      const data = await getProviderSkills(selectedProvider, activeLevel);
      const allowedSkills = ["hoeren", "lesen", "schreiben", "sprechen", "sprachbausteine"];
      setSkills((data.skills || []).filter(s => allowedSkills.includes(s.skill)));
    } catch (err) {
      console.error("Error loading skills:", err);
      setError("حدث خطأ أثناء تحميل المهارات.");
    } finally {
      setLoadingSkills(false);
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPublicExams({
        level: activeLevel,
        provider: selectedProvider,
        mainSkill: selectedSkill,
      });
      const rawExams = data.items || data || [];
      rawExams.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setExams(rawExams);
    } catch (err) {
      console.error("Error loading exams:", err);
      if (err.response?.status === 401) {
        navigate("/login?redirect=" + encodeURIComponent(window.location.pathname));
      } else if (err.response?.status === 404) {
        setError("لا توجد امتحانات متاحة لهذه المهارة.");
      } else {
        setError("حدث خطأ أثناء تحميل الامتحانات. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProviderClick = (providerId) => {
    setSelectedProvider(providerId);
    setSelectedSkill(null);
    setSkills([]);
    setExams([]);
    // تحديث المستوى تلقائي لأول مستوى متاح للمزود
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (provider && !provider.allowedLevels.includes(activeLevel)) {
      setActiveLevel(provider.allowedLevels[0]);
    }
  };

  const handleSkillClick = (skillId) => {
    setSelectedSkill(skillId);
    setExams([]);
  };

  const handleExamClick = (examId) => {
    navigate(`/pruefungen/exam/${examId}`);
  };

  const handleBackToSkills = () => {
    setSelectedSkill(null);
    setExams([]);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setSelectedSkill(null);
    setSkills([]);
    setExams([]);
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
            الامتحانات الرسمية <span className="text-red-600">Prüfungen</span>
          </h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            من خلال هذا القسم بتقدري تجهزي لامتحانات Goethe, TELC, ÖSD, DTB, DTZ, ECL
            وتشوفي شكل الامتحان، تقسيمه لمهارات الاستماع، القراءة، الكتابة،
            والمحادثة، مع تدريبات عملية لكل مستوى. 📝
          </p>
        </div>

        {/* Tabs للمستويات */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {(selectedProvider
            ? PROVIDERS.find(p => p.id === selectedProvider)?.allowedLevels || levelNames
            : levelNames
          ).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => { setActiveLevel(level); setSelectedSkill(null); setExams([]); }}
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

        {/* إذا ما في جهة مختارة - عرض كروت الجهات */}
        {!selectedProvider && (
          <>
            {/* عنوان قسم الجهات */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                اختاري الجهة المنظمة للامتحان
              </h2>
              <p className="text-xs text-slate-500 max-w-xl mx-auto">
                كل جهة إلها طريقة خاصة في الامتحان وتقسيم الدرجات، لكن الكل
                بيعتمد على المهارات الأربع الأساسية.
              </p>
            </div>

            {/* كروت الجهات الممتحنة */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
              {PROVIDERS.filter(p => p.allowedLevels.includes(activeLevel)).map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderClick(provider.id)}
                  className="group text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-xl">
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {provider.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        المستويات: {provider.levels}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    {provider.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-red-600">
                    <span className="font-semibold group-hover:underline">
                      عرض امتحانات {provider.name}
                    </span>
                    <span>↗</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* إذا في جهة مختارة بدون مهارة - عرض المهارات */}
        {selectedProvider && !selectedSkill && (
          <div className="mb-12">
            <button
              onClick={handleBackToProviders}
              className="mb-6 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2"
            >
              ← الرجوع لاختيار جهة أخرى
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {PROVIDERS.find((p) => p.id === selectedProvider)?.name} — {activeLevel}
              </h2>
              <p className="text-sm text-slate-500">
                اختاري المهارة اللي بدك تتدربي عليها
              </p>
            </div>

            {loadingSkills && (
              <div className="text-center text-slate-500 text-sm mt-10">
                جاري تحميل المهارات…
              </div>
            )}

            {error && !loadingSkills && (
              <div className="text-center text-red-600 text-sm mt-10 bg-red-50 border border-red-100 rounded-xl py-4">
                {error}
              </div>
            )}

            {!loadingSkills && !error && skills.length === 0 && (
              <div className="text-center text-slate-500 text-sm mt-10 bg-slate-50 border border-slate-200 rounded-xl py-8">
                لا توجد مهارات متاحة حالياً لهذا المستوى والجهة.
              </div>
            )}

            {!loadingSkills && !error && skills.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {skills.map((skill) => {
                  const info = EXAM_SKILLS.find((s) => s.id === skill.skill);
                  return (
                    <button
                      key={skill.skill}
                      type="button"
                      onClick={() => handleSkillClick(skill.skill)}
                      className="group text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                    >
                      <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl mb-3">
                        {info?.icon || "📝"}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {skill.label || info?.title || skill.skill}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        {skill.count} {skill.count === 1 ? "امتحان" : "امتحانات"}
                      </p>
                      <span className="text-[11px] text-red-600 font-semibold group-hover:underline">
                        عرض الامتحانات ↗
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* إذا في جهة ومهارة مختارة - عرض الامتحانات */}
        {selectedProvider && selectedSkill && (
          <div className="mb-12">
            <button
              onClick={handleBackToSkills}
              className="mb-6 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2"
            >
              ← الرجوع للمهارات
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {EXAM_SKILLS.find((s) => s.id === selectedSkill)?.title || selectedSkill}
              </h2>
              <p className="text-sm text-slate-500">
                {PROVIDERS.find((p) => p.id === selectedProvider)?.name} — {activeLevel}
              </p>
            </div>

            {loading && (
              <div className="text-center text-slate-500 text-sm mt-10">
                جاري تحميل الامتحانات…
              </div>
            )}

            {error && !loading && (
              <div className="text-center text-red-600 text-sm mt-10 bg-red-50 border border-red-100 rounded-xl py-4">
                {error}
              </div>
            )}

            {!loading && !error && exams.length === 0 && (
              <div className="text-center text-slate-500 text-sm mt-10 bg-slate-50 border border-slate-200 rounded-xl py-8">
                لا توجد امتحانات متاحة حالياً لهذه المهارة.
              </div>
            )}

            {!loading && !error && exams.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="ltr">
                {exams.map((exam) => (
                  <button
                    key={exam.id || exam._id}
                    type="button"
                    onClick={() => handleExamClick(exam.id || exam._id)}
                    className="group text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                        📝
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {exam.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {exam.level} • {exam.provider}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                      {exam.description || "امتحان تجريبي شامل"}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {exam.timeLimitMin ? `${exam.timeLimitMin} دقيقة` : "بدون وقت محدد"}
                      </span>
                      <span className="text-red-600 font-semibold group-hover:underline">
                        ابدأ الامتحان ↗
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* قسم بنية الامتحان */}
        {!selectedProvider && (
          <>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-8 mb-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  كيف بيكون شكل الامتحان؟
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                  أغلب الامتحانات الرسمية بتتكوّن من أربع مهارات رئيسية، وكل مهارة ممكن
                  تكون مقسومة لأجزاء (Teile) بعدد معيّن حسب الجهة والمستوى.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {EXAM_SKILLS.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-2xl mb-3">
                      {skill.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">
                      {skill.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* قسم كيف تستخدمي */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  كيف تستخدمي قسم الامتحانات؟
                </h2>
              </div>

              <div className="max-w-2xl mx-auto">
                <ol className="space-y-4">
                  {[
                    'من الصفحة الرئيسية اضغطي على بطاقة "Prüfungen".',
                    "اختاري الجهة المنظمة للامتحان من الكروت الموجودة فوق.",
                    "اختاري المستوى المناسب إلك (A1, A2, B1, B2, C1...).",
                    "اطّلعي على شكل الامتحان وتقسيمه لكل مهارة مع الأمثلة.",
                    "ابدئي حل تدريبات محاكية للامتحان الحقيقي عن طريق الكويزات.",
                  ].map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
