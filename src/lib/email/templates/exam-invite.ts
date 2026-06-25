import { EXAM_DURATION_MS } from "@/lib/exam/questions";
import { getExamRules } from "@/lib/exam/rules";

const EXAM_DURATION_MINUTES = Math.round(EXAM_DURATION_MS / 60000);

function renderExamRulesHtml(): string {
  const rules = getExamRules(EXAM_DURATION_MINUTES);
  return rules
    .map((rule, index) => {
      const isLast = index === rules.length - 1;
      const margin = isLast ? "" : "margin-bottom:8px;";
      const text = escapeHtml(rule.text);

      if (rule.type === "warning") {
        return `<li style="${margin}padding:10px 12px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-weight:600;list-style-position:inside;">${text}</li>`;
      }

      return `<li style="${margin}">${text}</li>`;
    })
    .join("\n                      ");
}

export type ExamInviteTemplateParams = {
  candidateName: string;
  examTypeLabel: string;
  magicLinkUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildExamInviteHtml(params: ExamInviteTemplateParams): string {
  const name = escapeHtml(params.candidateName);
  const examType = escapeHtml(params.examTypeLabel);
  const link = escapeHtml(params.magicLinkUrl);

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>הזמנה למבחן</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Segoe UI,Tahoma,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;background:linear-gradient(180deg,#eef2ff 0%,#ffffff 100%);">
              <p style="margin:0;font-size:28px;font-weight:700;line-height:1.3;color:#1e293b;direction:rtl;">
                <span style="color:#4f46e5;">code</span>
                <span style="color:#4f46e5;">[</span><span style="color:#4f46e5;">beyond</span><span style="color:#4f46e5;">]</span>
              </p>
              <p style="margin:12px 0 0;font-size:14px;color:#64748b;direction:rtl;">מערכת מבחנים למועמדים</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;direction:rtl;text-align:right;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.4;">
                שלום ${name},
              </h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#334155;">
                הגיע מועד המבחן שלך. סוג המבחן: <strong style="color:#4f46e5;">${examType}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2ff;border-radius:12px;border:1px solid #c7d2fe;">
                <tr>
                  <td style="padding:20px 22px;direction:rtl;text-align:right;">
                    <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#312e81;">כללי המבחן</h2>
                    <ul style="margin:0;padding:0 20px 0 0;font-size:15px;line-height:1.75;color:#334155;">
                      ${renderExamRulesHtml()}
                    </ul>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#4f46e5;">
                    <a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                      כניסה למבחן
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b;word-break:break-all;">
                אם הכפתור לא עובד, העתיקו את הקישור:<br />
                <a href="${link}" style="color:#4f46e5;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f1f5f9;background-color:#f8fafc;direction:rtl;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                [beyond] code · dev@beyondtcode.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
