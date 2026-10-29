import nodemailer from "nodemailer";

export async function sendMail({ to, subject, text }) {
  if (!to) throw new Error("Email recipient is required.");

  // Preferred provider: Resend. Keep RESEND_API_KEY on the server only.
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "onboarding@resend.dev",
        to: [to],
        subject,
        text,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend email failed (${response.status}): ${details.slice(0, 300)}`);
    }
    return response.json();
  }

  // Optional SMTP fallback for local/alternate mail providers.
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Configure RESEND_API_KEY or SMTP MAIL_HOST/MAIL_USER/MAIL_PASS.");
  }
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === "true",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text,
  });
}
