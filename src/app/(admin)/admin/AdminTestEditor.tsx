"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
  type ExamTypeId,
} from "@/lib/exam/exam-types";

type EditableQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

type EditableExam = {
  examTypeId?: ExamTypeId;
  title: string;
  durationMinutes: number;
  questions: EditableQuestion[];
};

type ApiErrorResponse = {
  error: string;
};

export function AdminTestEditor() {
  const [selectedExamTypeId, setSelectedExamTypeId] =
    useState<ExamTypeId>("exam-a");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<EditableExam>({
    title: "",
    durationMinutes: 50,
    questions: [],
  });

  const canSave = useMemo(() => {
    return !loading && !saving && loaded && exam.questions.length > 0;
  }, [exam.questions.length, loaded, loading, saving]);

  async function loadExam(examTypeId: ExamTypeId) {
    setLoading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch(
        `/api/admin/test?examTypeId=${encodeURIComponent(examTypeId)}`
      );
      const data = (await res.json()) as EditableExam | ApiErrorResponse;

      if (!res.ok) {
        setError("לא ניתן לטעון את המבחן. " + ("error" in data ? data.error : ""));
        return;
      }

      setExam(data as EditableExam);
      setLoaded(true);
    } catch {
      setError("אירעה שגיאה בטעינת המבחן.");
    } finally {
      setLoading(false);
    }
  }

  function switchExamType(examTypeId: ExamTypeId) {
    setSelectedExamTypeId(examTypeId);
    setLoaded(false);
    setSaveMessage(null);
    setError(null);
    setExam({ title: "", durationMinutes: 50, questions: [] });
  }

  function addQuestion() {
    setExam((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q${prev.questions.length + 1}`,
          prompt: "",
          options: ["", ""],
          correctIndex: 0,
        },
      ],
    }));
  }

  function removeQuestion(questionIndex: number) {
    setExam((prev) => {
      const nextQuestions = prev.questions.filter((_, idx) => idx !== questionIndex);
      return {
        ...prev,
        questions: nextQuestions.map((question, idx) => ({
          ...question,
          id: `q${idx + 1}`,
        })),
      };
    });
  }

  function setQuestionPrompt(questionIndex: number, value: string) {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) =>
        idx === questionIndex ? { ...question, prompt: value } : question
      ),
    }));
  }

  function addOption(questionIndex: number) {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) =>
        idx === questionIndex
          ? { ...question, options: [...question.options, ""] }
          : question
      ),
    }));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) => {
        if (idx !== questionIndex || question.options.length <= 2) {
          return question;
        }

        const nextOptions = question.options.filter((_, optIdx) => optIdx !== optionIndex);
        let nextCorrectIndex = question.correctIndex;
        if (optionIndex === question.correctIndex) {
          nextCorrectIndex = 0;
        } else if (optionIndex < question.correctIndex) {
          nextCorrectIndex = question.correctIndex - 1;
        }

        return {
          ...question,
          options: nextOptions,
          correctIndex: nextCorrectIndex,
        };
      }),
    }));
  }

  function setOptionValue(questionIndex: number, optionIndex: number, value: string) {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) =>
        idx === questionIndex
          ? {
              ...question,
              options: question.options.map((option, optIdx) =>
                optIdx === optionIndex ? value : option
              ),
            }
          : question
      ),
    }));
  }

  function setCorrectAnswer(questionIndex: number, optionIndex: number) {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) =>
        idx === questionIndex ? { ...question, correctIndex: optionIndex } : question
      ),
    }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch(
        `/api/admin/test?examTypeId=${encodeURIComponent(selectedExamTypeId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: exam.title,
            durationMinutes: exam.durationMinutes,
            questions: exam.questions.map((question) => ({
              prompt: question.prompt,
              options: question.options,
              correctIndex: question.correctIndex,
            })),
          }),
        }
      );

      const data = (await res.json()) as
        | { ok: true; exam: EditableExam }
        | ApiErrorResponse;
      if (!res.ok) {
        setError("לא ניתן לשמור את המבחן. " + ("error" in data ? data.error : ""));
        return;
      }

      setExam((data as { ok: true; exam: EditableExam }).exam);
      setSaveMessage(`המבחן ${EXAM_TYPE_LABELS[selectedExamTypeId]} נשמר בהצלחה.`);
    } catch {
      setError("אירעה שגיאה בשמירת המבחן.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">עריכת מבחנים</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            בחרי סוג מבחן וערכי שאלות, אפשרויות ותשובות נכונות.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadExam(selectedExamTypeId)}
          disabled={loading || saving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "טוענת…" : loaded ? "רענון מבחן" : "טעינת מבחן"}
        </button>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="סוגי מבחן"
      >
        {EXAM_TYPE_IDS.map((examTypeId) => (
          <button
            key={examTypeId}
            type="button"
            role="tab"
            aria-selected={selectedExamTypeId === examTypeId}
            onClick={() => switchExamType(examTypeId)}
            disabled={loading || saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              selectedExamTypeId === examTypeId
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/60"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {EXAM_TYPE_LABELS[examTypeId]}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="mt-5 text-sm text-slate-600">
          לחצי על &quot;טעינת מבחן&quot; כדי להתחיל לערוך את{" "}
          {EXAM_TYPE_LABELS[selectedExamTypeId]}.
        </p>
      ) : (
        <form className="mt-6 space-y-6" onSubmit={onSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">שם המבחן</span>
              <input
                type="text"
                value={exam.title}
                onChange={(e) =>
                  setExam((prev) => ({ ...prev, title: e.target.value }))
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                משך מבחן (דקות)
              </span>
              <input
                type="number"
                min={5}
                max={180}
                value={exam.durationMinutes}
                onChange={(e) =>
                  setExam((prev) => ({
                    ...prev,
                    durationMinutes: Number(e.target.value),
                  }))
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          <div className="space-y-4">
            {exam.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    שאלה {questionIndex + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={saving || exam.questions.length <= 1}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    מחיקת שאלה
                  </button>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">נוסח שאלה</span>
                  <textarea
                    value={question.prompt}
                    onChange={(e) => setQuestionPrompt(questionIndex, e.target.value)}
                    disabled={saving}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                <div className="mt-4 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={`${question.id}-option-${optionIndex}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="radio"
                        name={`${question.id}-correct`}
                        checked={question.correctIndex === optionIndex}
                        onChange={() => setCorrectAnswer(questionIndex, optionIndex)}
                        disabled={saving}
                        className="h-4 w-4 accent-indigo-600"
                        title="סימון כתשובה נכונה"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          setOptionValue(questionIndex, optionIndex, e.target.value)
                        }
                        disabled={saving}
                        className="min-w-[16rem] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                        placeholder={`אפשרות ${optionIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(questionIndex, optionIndex)}
                        disabled={saving || question.options.length <= 2}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        הסרה
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addOption(questionIndex)}
                  disabled={saving}
                  className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  הוספת אפשרות
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addQuestion}
              disabled={saving}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              הוספת שאלה
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "שומרת…" : "שמירת מבחן"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {saveMessage && (
        <p
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {saveMessage}
        </p>
      )}
    </div>
  );
}
