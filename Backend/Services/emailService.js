const nodemailer = require("nodemailer");
const ApiError = require("../Utils/apiError");
const logger = require("../Utils/logger");
const { smtp, company, clientUrl, enquiryNotifyEmails } = require("../Config/env");

let transporter;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const label = (s) => (s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Other");
const dashboardUrl = clientUrl.split(",")[0].trim();
const isConfigured = () => Boolean(smtp.host && smtp.user && smtp.pass);

const getTransporter = () => {
  if (!isConfigured()) {
    throw new ApiError(503, "Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass }
    });
  }
  return transporter;
};

const deliver = ({ to, subject, html, attachments, replyTo }) =>
  getTransporter().sendMail({ from: `"${company.name}" <${smtp.from}>`, to, subject, html, attachments, replyTo });

// For emails the user is waiting on (invoice, report, password reset).
// The real SMTP error goes to the server log; the user gets a clear 502 instead
// of a 500 with raw mail-server details.
const sendEmail = async (options) => {
  try {
    return await deliver(options);
  } catch (err) {
    if (err instanceof ApiError) throw err; // e.g. 503 "Email is not configured"
    logger.error(`Email to ${options.to} failed: ${err.message}`);
    throw new ApiError(502, "We couldn't send the email right now. Please try again in a few minutes.");
  }
};

// Fire-and-forget notifications should never break the request that triggered them
const sendEmailSafe = async (options) => {
  if (!isConfigured()) return;
  try {
    await deliver(options);
  } catch (err) {
    logger.warn(`Email to ${options.to} failed: ${err.message}`);
  }
};

const sendInvoiceEmail = (invoice, pdfBuffer, to) =>
  sendEmail({
    to,
    subject: `Invoice ${invoice.invoiceNo} from ${company.name}`,
    html: `
      <p>Dear ${esc(invoice.client.name)},</p>
      <p>Please find attached invoice <b>${invoice.invoiceNo}</b> for the service carried out.</p>
      <p>Total: <b>${company.currency} ${invoice.total.toLocaleString()}</b><br/>
         Balance due: <b>${company.currency} ${invoice.balance.toLocaleString()}</b></p>
      <p>Thank you,<br/>${company.name}</p>`,
    attachments: [{ filename: `${invoice.invoiceNo}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
  });

const sendReportEmail = (report, pdfBuffer, to) =>
  sendEmail({
    to,
    subject: `Service report ${report.service.serviceNo} from ${company.name}`,
    html: `
      <p>Dear ${esc(report.client.name)},</p>
      <p>Please find attached the signed service report for <b>${esc(report.service.title)}</b>
         (${esc(report.service.serviceNo)}), carried out by ${esc(report.technician.name)}.</p>
      ${report.recommendations ? `<p><b>Our recommendations:</b><br/>${esc(report.recommendations)}</p>` : ""}
      <p>Thank you,<br/>${company.name}</p>`,
    attachments: [
      { filename: `Service-Report-${report.service.serviceNo}.pdf`, content: pdfBuffer, contentType: "application/pdf" }
    ]
  });

const notifyTechnicianAssigned = (technician, service) =>
  sendEmailSafe({
    to: technician.email,
    subject: `New job assigned: ${service.serviceNo}`,
    html: `
      <p>Hi ${esc(technician.name)},</p>
      <p>You have been assigned <b>${esc(service.title)}</b> (${service.serviceNo}).</p>
      <p>Scheduled: ${service.scheduledDate ? new Date(service.scheduledDate).toDateString() : "To be confirmed"}<br/>
         Address: ${esc(service.address || "-")}</p>
      <p>Log in to your dashboard for details.</p>`
  });

const acknowledgeEnquiry = (enquiry) =>
  sendEmailSafe({
    to: enquiry.email,
    subject: `We received your enquiry - ${company.name}`,
    html: `<p>Hi ${esc(enquiry.name)},</p><p>Thanks for contacting us. Our team will get back to you shortly.</p><p>${company.name}</p>`
  });

// Who hears about new website enquiries: ENQUIRY_NOTIFY_EMAILS if set, otherwise every active admin
const getEnquiryRecipients = async () => {
  if (enquiryNotifyEmails.length) return enquiryNotifyEmails;
  const User = require("../Models/User");
  const admins = await User.find({ role: "admin", isActive: true }).select("email");
  return admins.map((a) => a.email);
};

// Alerts the admin(s) about a new contact-form enquiry. Never throws: the
// customer's form submission must succeed even if email is down.
const notifyAdminsNewEnquiry = async (enquiry) => {
  if (!isConfigured()) return;
  try {
    const to = await getEnquiryRecipients();
    if (!to.length) return;

    const row = (k, v) =>
      v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>` : "";
    const serviceType = label(enquiry.serviceType);
    const preferred = enquiry.preferredDate
      ? new Date(enquiry.preferredDate).toLocaleDateString("en-GB", {
          weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: company.timezone
        })
      : "";
    const received = new Date(enquiry.createdAt || Date.now()).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: company.timezone
    });

    await sendEmailSafe({
      to,
      replyTo: enquiry.email, // hit Reply to answer the customer directly
      subject: `New enquiry: ${serviceType} - ${String(enquiry.name).replace(/[\r\n]+/g, " ")}`,
      html: `
        <p>A new enquiry was submitted on the website.</p>
        <table style="border-collapse:collapse;font-size:14px">
          ${row("Name", esc(enquiry.name))}
          ${row("Phone", `<a href="tel:${esc(enquiry.phone)}">${esc(enquiry.phone)}</a>`)}
          ${row("Email", `<a href="mailto:${esc(enquiry.email)}">${esc(enquiry.email)}</a>`)}
          ${row("Address", esc(enquiry.address))}
          ${row("Service", esc(serviceType))}
          ${row("Preferred date", esc(preferred))}
          ${row("Received", esc(received))}
        </table>
        <p style="margin-top:16px"><b>Message:</b></p>
        <p style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:6px">${esc(enquiry.message)}</p>
        <p>Reply to this email to respond to the customer, or
           <a href="${esc(dashboardUrl)}">open the dashboard</a> to convert it into a service.</p>`
    });
  } catch (err) {
    logger.warn(`New-enquiry notification failed: ${err.message}`);
  }
};

const sendPasswordResetEmail = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: `Reset your password - ${company.name}`,
    html: `
      <p>Hi ${esc(user.name)},</p>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${esc(resetUrl)}">Reset my password</a></p>
      <p>This link expires in 30 minutes and can only be used once.
         If you did not request this, you can ignore this email; your password will not change.</p>
      <p>${company.name}</p>`
  });

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendReportEmail,
  notifyTechnicianAssigned,
  acknowledgeEnquiry,
  notifyAdminsNewEnquiry,
  sendPasswordResetEmail,
  isConfigured
};
