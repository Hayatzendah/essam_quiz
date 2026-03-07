import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getQuizNouns } from "../services/api";
import confetti from "canvas-confetti";

export default function DerDieDasQuiz() {
  const { level } = useParams();
  const [searchParams] = useSearchParams();
  const count = parseInt(searchParams.get("count") || "10", 10);
  const navigate = useNavigate();

  const [nouns, setNouns] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("loading"); // loading | question | feedback | finished
  const timerRef = useRef(null);

  // Fetch nouns on mount
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");

    getQuizNouns(level, count)
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setNouns(list);
          setPhase(list.length > 0 ? "question" : "finished");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNouns([]);
          setPhase("finished");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [level, count]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const goNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentIndex + 1 >= nouns.length) {
      setPhase("finished");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase("question");
    }
  }, [currentIndex, nouns.length]);

  const handleAnswer = (article) => {
    if (phase !== "question" || !nouns[currentIndex]) return;

    const correct = nouns[currentIndex].article === article;
    setSelectedAnswer(article);
    setIsCorrect(correct);
    setPhase("feedback");

    if (correct) {
      setScore((prev) => prev + 1);
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      timerRef.current = setTimeout(goNext, 3000);
    } else {
      timerRef.current = setTimeout(goNext, 5000);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setPhase("loading");

    getQuizNouns(level, count)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNouns(list);
        setPhase(list.length > 0 ? "question" : "finished");
      })
      .catch(() => {
        setNouns([]);
        setPhase("finished");
      });
  };

  const noun = nouns[currentIndex];
  const total = nouns.length;
  const progress = total > 0 ? ((currentIndex + (phase === "feedback" ? 1 : 0)) / total) * 100 : 0;

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  // Score screen
  if (phase === "finished") {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const colorClass =
      pct >= 80
        ? "text-green-600"
        : pct >= 50
        ? "text-amber-500"
        : "text-red-600";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-sm w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">
            {pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">النتيجة</h2>
          <div className={`text-5xl font-bold mb-2 ${colorClass}`}>
            {score}/{total}
          </div>
          <p className={`text-lg font-semibold mb-6 ${colorClass}`}>{pct}%</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition"
            >
              إعادة الاختبار
            </button>
            <button
              onClick={() => navigate("/derdiedas")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
            >
              العودة للمستويات
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz question
  const articles = ["der", "die", "das"];

  const getButtonClass = (article) => {
    const base =
      "py-5 px-6 rounded-xl text-2xl font-bold transition border-2 ";

    if (phase === "feedback") {
      if (article === noun.article) {
        return base + "bg-green-100 border-green-500 text-green-700";
      }
      if (article === selectedAnswer && !isCorrect) {
        return base + "bg-red-100 border-red-500 text-red-700";
      }
      return base + "bg-slate-50 border-slate-200 text-slate-400";
    }

    return (
      base +
      "bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400 cursor-pointer"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl w-[80%] mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate("/derdiedas")}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ✕ إنهاء
            </button>
            <span className="text-sm font-medium text-slate-600">
              Frage {currentIndex + 1}/{total}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-[8.19rem] text-center mb-8">
          <p className="text-sm text-slate-400 mb-4">اختر الأداة الصحيحة:</p>
          <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            <span className="text-purple-400">___</span> {noun?.singular}
          </div>
          <p className="text-2xl text-slate-500">
            die {noun?.plural}
          </p>
        </div>

        {/* Article Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {articles.map((article) => (
            <button
              key={article}
              onClick={() => handleAnswer(article)}
              disabled={phase === "feedback"}
              className={getButtonClass(article)}
            >
              {article}
            </button>
          ))}
        </div>

        {/* Feedback + Next */}
        {phase === "feedback" && (
          <div className="text-center">
            <p
              className={`text-lg font-bold mb-3 ${
                isCorrect ? "text-green-600" : "text-red-600"
              }`}
            >
              {isCorrect ? "صحيح! 🎉" : `خطأ — الإجابة الصحيحة: ${noun?.article}`}
            </p>
            <button
              onClick={goNext}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              التالي →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
