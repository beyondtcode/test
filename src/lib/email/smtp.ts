import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { smtpConfig } from "@/lib/env";
import { EMAIL_FROM, EXAM_INVITE_SUBJECT } from "./constants";
import {
  buildExamInviteHtml,
  type ExamInviteTemplateParams,
} from "./templates/exam-invite";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const port = smtpConfig.port;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password,
    },
    ...(secure ? {} : { requireTLS: true }),
  });

  return transporter;
}

export type SendExamInviteEmailParams = ExamInviteTemplateParams & {
  to: string;
};

export async function sendExamInviteEmail(
  params: SendExamInviteEmailParams
): Promise<void> {
  const { to, candidateName, examTypeLabel, magicLinkUrl } = params;

  await getTransporter().sendMail({
    from: EMAIL_FROM,
    to,
    subject: EXAM_INVITE_SUBJECT,
    html: buildExamInviteHtml({
      candidateName,
      examTypeLabel,
      magicLinkUrl,
    }),
  });
}
