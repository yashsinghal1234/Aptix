"use server";

import { Resend } from "resend";

export interface HostInquiryData {
  firstName?: string;
  lastName?: string;
  name?: string;
  emailOrPhone?: string;
  email?: string;
  organization?: string;
  estimatedCandidates?: string;
  examType?: string;
  message?: string;
}

export async function submitExamInquiryAction(data: HostInquiryData) {
  try {
    const fullName =
      (data.firstName || data.lastName)
        ? `${data.firstName || ""} ${data.lastName || ""}`.trim()
        : data.name?.trim() || "Anonymous";

    const contactEmail = (data.email?.trim() || data.emailOrPhone?.trim() || "").toLowerCase();

    if (!fullName || fullName === "Anonymous") {
      return { error: "Please enter your name." };
    }

    if (!contactEmail || !contactEmail.includes("@")) {
      return { error: "Please enter a valid email address so we can reach you." };
    }

    const organization = data.organization?.trim() || "Not specified";
    const message = data.message?.trim() || "Interested in conducting examinations on Aptix.";

    // 1. Structured logging of inquiry in server logs
    console.log("[HOST_EXAM_INQUIRY]", {
      timestamp: new Date().toISOString(),
      name: fullName,
      email: contactEmail,
      organization,
      message,
    });

    // 2. Dispatch email directly via Resend in the background
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.ADMIN_INQUIRY_EMAIL || "singhalyash307@gmail.com";

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #07080c; color: #ffffff; border-radius: 18px; border: 1px solid #232733;">
          <div style="margin-bottom: 22px; border-bottom: 1px solid #1e222d; padding-bottom: 18px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #bef264; background: rgba(190, 242, 100, 0.12); border: 1px solid rgba(190, 242, 100, 0.25); padding: 4px 10px; border-radius: 999px;">Aptix Inquiry</span>
            <h2 style="margin: 14px 0 4px; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">New Platform Reachout</h2>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">Submitted directly via the Aptix Login Portal contact form.</p>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 18px; margin-bottom: 22px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 7px 0; color: #71717a; width: 130px; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Sender Name:</td>
                <td style="padding: 7px 0; color: #ffffff; font-weight: 700;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #71717a; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Sender Email:</td>
                <td style="padding: 7px 0; color: #bef264; font-weight: 600;"><a href="mailto:${contactEmail}" style="color: #bef264; text-decoration: none;">${contactEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #71717a; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Institution:</td>
                <td style="padding: 7px 0; color: #ffffff;">${organization}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 8px;">Message Content:</p>
            <div style="background: #111319; border-left: 3px solid #bef264; border-radius: 8px; padding: 16px 18px; font-size: 14px; line-height: 1.6; color: #f4f4f5; white-space: pre-wrap;">${message}</div>
          </div>

          <div style="border-top: 1px solid #1e222d; padding-top: 16px; font-size: 12px; color: #71717a; display: flex; justify-content: space-between; align-items: center;">
            <span>Aptix Assessment Engine · Live Reachout</span>
            <a href="mailto:${contactEmail}?subject=Re: Aptix Inquiry - ${encodeURIComponent(fullName)}" style="color: #ffffff; font-weight: 700; text-decoration: underline;">Reply Directly &rarr;</a>
          </div>
        </div>
      `;

      const result = await resend.emails.send({
        from: "Aptix <onboarding@resend.dev>",
        to: recipientEmail,
        replyTo: contactEmail,
        subject: `[Aptix Inquiry] ${fullName} (${organization !== "Not specified" ? organization : "General"})`,
        html: htmlContent,
      });

      if (result.error) {
        console.error("[RESEND_ERROR]", result.error);
        return { error: `Email delivery issue: ${result.error.message}` };
      }
    } else {
      console.warn(
        "[RESEND_NOTICE] RESEND_API_KEY is not defined in .env. The submission was logged to the server, but direct email delivery requires adding RESEND_API_KEY to your .env file."
      );
    }

    return {
      success: true,
      message: "Thank you! Your message has been sent successfully. We will get in touch with you shortly.",
    };
  } catch (err: any) {
    console.error("[INQUIRY_ERROR]", err);
    return { error: err?.message || "Failed to submit message. Please try again." };
  }
}
