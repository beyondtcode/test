"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
  type ExamTypeId,
} from "@/lib/exam/exam-types";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminSectionHeader,
  AdminTextarea,
  IconEdit,
} from "@/components/admin/AdminUI";

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
    <AdminCard>
      <AdminSectionHeader
        icon={<IconEdit />}
        title="עריכת מבחנים"
        description="בחרי סוג מבחן וערכי שאלות, אפשרויות ותשובות נכונות."
        action={
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => void loadExam(selectedExamTypeId)}
            disabled={loading || saving}
          >
            {loading ? "טוענת…" : loaded ? "רענון" : "טעינת מבחן"}
          </AdminButton>
        }
      />

      <div
        className="flex flex-wrap gap-2"
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
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              selectedExamTypeId === examTypeId
                ? "bg-gradient-to-l from-brand-600 to-violet-600 text-white shadow-md shadow-brand-300/40"
                : "border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {EXAM_TYPE_LABELS[examTypeId]}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
          <p className="text-sm text-slate-600">
            לחצי על &quot;טעינת מבחן&quot; כדי להתחיל לערוך את{" "}
            <strong>{EXAM_TYPE_LABELS[selectedExamTypeId]}</strong>
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-6" onSubmit={onSave}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <AdminLabel>שם המבחן</AdminLabel>
              <AdminInput
                type="text"
                value={exam.title}
                onChange={(e) =>
                  setExam((prev) => ({ ...prev, title: e.target.value }))
                }
                disabled={saving}
              />
            </label>

            <label className="block">
              <AdminLabel>משך מבחן (דקות)</AdminLabel>
              <AdminInput
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
              />
            </label>
          </div>

          <div className="space-y-4">
            {exam.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white">
                      {questionIndex + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      שאלה {questionIndex + 1}
                    </h3>
                  </div>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={saving || exam.questions.length <= 1}
                  >
                    מחיקה
                  </AdminButton>
                </div>

                <label className="block">
                  <AdminLabel>נוסח שאלה</AdminLabel>
                  <AdminTextarea
                    value={question.prompt}
                    onChange={(e) => setQuestionPrompt(questionIndex, e.target.value)}
                    disabled={saving}
                    rows={2}
                  />
                </label>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    סמני את התשובה הנכונה
                  </p>
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={`${question.id}-option-${optionIndex}`}
                      className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2 transition ${
                        question.correctIndex === optionIndex
                          ? "border-emerald-300 bg-emerald-50/60"
                          : "border-transparent bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${question.id}-correct`}
                        checked={question.correctIndex === optionIndex}
                        onChange={() => setCorrectAnswer(questionIndex, optionIndex)}
                        disabled={saving}
                        className="h-4 w-4 accent-emerald-600"
                        title="סימון כתשובה נכונה"
                      />
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {String.fromCharCode(1488 + optionIndex)}
                      </span>
                      <AdminInput
                        type="text"
                        value={option}
                        onChange={(e) =>
                          setOptionValue(questionIndex, optionIndex, e.target.value)
                        }
                        disabled={saving}
                        placeholder={`אפשרות ${optionIndex + 1}`}
                        className="mt-0 min-w-[12rem] flex-1"
                      />
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(questionIndex, optionIndex)}
                        disabled={saving || question.options.length <= 2}
                      >
                        הסרה
                      </AdminButton>
                    </div>
                  ))}
                </div>

                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => addOption(questionIndex)}
                  disabled={saving}
                  className="mt-3"
                >
                  + הוספת אפשרות
                </AdminButton>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
            <AdminButton
              variant="ghost"
              onClick={addQuestion}
              disabled={saving}
            >
              + הוספת שאלה
            </AdminButton>
            <AdminButton type="submit" disabled={!canSave}>
              {saving ? "שומרת…" : "שמירת מבחן"}
            </AdminButton>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-5">
          <AdminAlert variant="error">{error}</AdminAlert>
        </div>
      )}

      {saveMessage && (
        <div className="mt-5">
          <AdminAlert variant="success" role="status">
            {saveMessage}
          </AdminAlert>
        </div>
      )}
    </AdminCard>
  );
}
