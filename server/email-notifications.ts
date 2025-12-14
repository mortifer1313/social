import nodemailer from "nodemailer";
import type { Campaign, SocialAccount } from "@shared/schema";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
}

let emailConfig: EmailConfig | null = null;
let transporter: nodemailer.Transporter | null = null;

export function initializeEmailNotifications(): boolean {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.NOTIFICATION_EMAIL;

  if (!host || !port || !user || !pass || !to) {
    console.log("[Email] Email notifications disabled - missing SMTP configuration");
    return false;
  }

  emailConfig = {
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: { user, pass },
    from: from || user,
    to,
  };

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  });

  console.log(`[Email] Email notifications enabled, sending to: ${to}`);
  return true;
}

export function isEmailEnabled(): boolean {
  return transporter !== null && emailConfig !== null;
}

async function sendEmail(subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
  if (!transporter || !emailConfig) {
    console.log("[Email] Email not configured, skipping notification");
    return false;
  }

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to: emailConfig.to,
      subject: `[Social Media Grower] ${subject}`,
      text: textBody || htmlBody.replace(/<[^>]*>/g, ""),
      html: htmlBody,
    });
    console.log(`[Email] Notification sent: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send notification:", error);
    return false;
  }
}

export async function notifyCampaignCompleted(campaign: Campaign): Promise<boolean> {
  const subject = `Campaign Completed: ${campaign.target}`;
  const successRate = campaign.totalComments > 0 
    ? Math.round((campaign.completedComments / campaign.totalComments) * 100) 
    : 0;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Campaign Completed Successfully</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Platform:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.platform}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Target:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.target}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Category:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.category}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Comments Posted:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.completedComments} / ${campaign.totalComments}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Success Rate:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${successRate}%</td>
        </tr>
      </table>
      <p style="color: #666; font-size: 12px;">This is an automated notification from Social Media Grower.</p>
    </div>
  `;

  return sendEmail(subject, html);
}

export async function notifyCampaignFailed(campaign: Campaign, errorMessage?: string): Promise<boolean> {
  const subject = `Campaign Failed: ${campaign.target}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Campaign Failed</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Platform:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.platform}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Target:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.target}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Comments Completed:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.completedComments} / ${campaign.totalComments}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Error:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #ef4444;">${errorMessage || campaign.errorMessage || "Unknown error"}</td>
        </tr>
      </table>
      <p style="color: #666; font-size: 12px;">This is an automated notification from Social Media Grower.</p>
    </div>
  `;

  return sendEmail(subject, html);
}

export async function notifyAccountIssue(
  account: SocialAccount, 
  issueType: "suspended" | "banned" | "low_health" | "session_expired",
  details?: string
): Promise<boolean> {
  const issueLabels: Record<string, { title: string; color: string }> = {
    suspended: { title: "Account Suspended", color: "#f97316" },
    banned: { title: "Account Banned", color: "#ef4444" },
    low_health: { title: "Low Health Score", color: "#eab308" },
    session_expired: { title: "Session Expired", color: "#6366f1" },
  };

  const issue = issueLabels[issueType];
  const subject = `${issue.title}: ${account.username}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${issue.color};">${issue.title}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Account:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${account.displayName || account.username}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Username:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">@${account.username}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Platform:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${account.platform}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Health Score:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${account.healthScore}%</td>
        </tr>
        ${details ? `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Details:</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${details}</td>
        </tr>
        ` : ""}
      </table>
      <h3>Recommended Actions:</h3>
      <ul style="color: #666;">
        ${issueType === "suspended" ? "<li>Wait 24-48 hours before using the account</li><li>Reduce automation frequency</li>" : ""}
        ${issueType === "banned" ? "<li>Remove the account from automation</li><li>Consider creating a new account</li>" : ""}
        ${issueType === "low_health" ? "<li>Put the account to rest for 24 hours</li><li>Reduce daily comment limits</li>" : ""}
        ${issueType === "session_expired" ? "<li>Re-login to the account to refresh the session</li>" : ""}
      </ul>
      <p style="color: #666; font-size: 12px;">This is an automated notification from Social Media Grower.</p>
    </div>
  `;

  return sendEmail(subject, html);
}

export async function notifyDailySummary(stats: {
  totalComments: number;
  successfulComments: number;
  failedComments: number;
  activeCampaigns: number;
  completedCampaigns: number;
  accountsAtRisk: number;
}): Promise<boolean> {
  const subject = "Daily Activity Summary";
  const successRate = stats.totalComments > 0 
    ? Math.round((stats.successfulComments / stats.totalComments) * 100) 
    : 100;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Daily Activity Summary</h2>
      <p>Here's your daily automation summary:</p>
      
      <h3 style="margin-top: 20px;">Comments</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">Total Attempts</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${stats.totalComments}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #10b981;">Successful</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #10b981;">${stats.successfulComments}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #ef4444;">Failed</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #ef4444;">${stats.failedComments}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Success Rate</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;"><strong>${successRate}%</strong></td>
        </tr>
      </table>

      <h3 style="margin-top: 20px;">Campaigns</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">Active</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${stats.activeCampaigns}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">Completed Today</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${stats.completedCampaigns}</td>
        </tr>
      </table>

      ${stats.accountsAtRisk > 0 ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
        <strong style="color: #b45309;">Warning:</strong> ${stats.accountsAtRisk} account(s) need attention due to low health scores or issues.
      </div>
      ` : ""}

      <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from Social Media Grower.</p>
    </div>
  `;

  return sendEmail(subject, html);
}

export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  if (!transporter || !emailConfig) {
    return { success: false, message: "Email not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and NOTIFICATION_EMAIL environment variables." };
  }

  try {
    await transporter.verify();
    return { success: true, message: "SMTP connection verified successfully" };
  } catch (error: any) {
    return { success: false, message: `SMTP connection failed: ${error.message}` };
  }
}

export async function sendTestEmail(): Promise<boolean> {
  const subject = "Test Notification";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Email Notifications Working!</h2>
      <p>If you're seeing this email, your email notification settings are configured correctly.</p>
      <p style="color: #666; font-size: 12px;">This is a test notification from Social Media Grower.</p>
    </div>
  `;
  return sendEmail(subject, html);
}

export function getEmailStatus(): { enabled: boolean; recipient: string | null } {
  return {
    enabled: isEmailEnabled(),
    recipient: emailConfig?.to || null,
  };
}
