import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { to, subject, message } = await req.json();

    await resend.emails.send({
      from: "Website Notifications <onboarding@resend.dev>",
      to,
      subject,
      html: `<p>${message}</p>`,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return Response.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}