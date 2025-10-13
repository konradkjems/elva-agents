/**
 * Email Service using Resend
 * 
 * Handles sending emails for invitations and notifications
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send manual review notification email to support
 */
export async function sendManualReviewEmail({
  supportEmail,
  contactName,
  contactEmail,
  message,
  widgetName,
  organizationName,
  conversationId,
  reviewId,
  conversationMessages
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Elva Solutions <onboarding@resend.dev>',
      to: [supportEmail],
      subject: `Manuel gennemgang anmodning - ${widgetName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manuel gennemgang anmodning - Elva Solutions</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f9fafb;
              }
              .email-wrapper {
                background-color: #f9fafb;
                padding: 40px 20px;
              }
              .email-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .logo-container {
                background: white;
                width: 80px;
                height: 80px;
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              }
              .logo {
                width: 70px;
                height: 70px;
                object-fit: contain;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                color: white;
                font-weight: 700;
              }
              .header p {
                margin: 10px 0 0;
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
              }
              .content {
                padding: 40px 30px;
                color: #374151;
              }
              .review-card {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border-radius: 12px;
                padding: 24px;
                margin: 24px 0;
                border: 1px solid #f59e0b;
              }
              .review-detail {
                display: flex;
                align-items: center;
                margin: 12px 0;
                font-size: 15px;
              }
              .review-detail strong {
                color: #1f2937;
              }
              .conversation-section {
                background: #f9fafb;
                border-radius: 8px;
                padding: 20px;
                margin: 24px 0;
                border: 1px solid #e5e7eb;
              }
              .conversation-title {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 16px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .message-item {
                margin: 12px 0;
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid #e5e7eb;
              }
              .message-item.user {
                background: #eff6ff;
                border-left-color: #3b82f6;
              }
              .message-item.assistant {
                background: #f0fdf4;
                border-left-color: #10b981;
              }
              .message-sender {
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 4px;
                text-transform: uppercase;
              }
              .message-content {
                font-size: 14px;
                color: #374151;
                line-height: 1.5;
              }
              .button {
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 16px;
                margin: 24px 0;
                box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.4);
                transition: transform 0.2s;
              }
              .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 8px -1px rgba(245, 158, 11, 0.5);
              }
              .message-section {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                border: 1px solid #e5e7eb;
              }
              .message-section p {
                margin: 0;
                font-size: 14px;
                color: #374151;
                font-style: italic;
              }
              .divider {
                border: none;
                border-top: 2px solid #f3f4f6;
                margin: 32px 0;
              }
              .footer {
                background: #1f2937;
                padding: 30px;
                text-align: center;
                color: #9ca3af;
              }
              .footer-logo {
                width: 40px;
                height: 40px;
                margin-bottom: 12px;
                object-fit: contain;
              }
              .footer strong {
                color: #f3f4f6;
                font-size: 16px;
              }
              .footer p {
                margin: 8px 0;
                font-size: 13px;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="header">
                  <div class="logo-container" style="margin-bottom: 12px;">
                    <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/Elva%20Logo%20Icon%202.png" alt="Elva Solutions" class="logo" />
                  </div>
                  <h1>Manuel gennemgang anmodning 🔍</h1>
                  <p>Ny anmodning kræver din opmærksomhed</p>
                </div>
                
                <div class="content">
                  <p style="font-size: 16px; margin-bottom: 24px;">Hej support team,</p>
                  
                  <p style="font-size: 16px;">En bruger har anmodet om manuel gennemgang af deres samtale med AI-assistenten.</p>
                  
                  <div class="review-card">
                    <div class="review-detail">
                      <span>👤 <strong>Kontakt navn:</strong> ${contactName || 'Ikke angivet'}
                    </div>
                    <div class="review-detail">
                      <span>📧 <strong>Kontakt email:</strong> ${contactEmail}
                    </div>
                    <div class="review-detail">
                      <span>🤖 <strong>Widget:</strong> ${widgetName}
                    </div>
                    <div class="review-detail">
                      <span>🏢 <strong>Organisation:</strong> ${organizationName}
                    </div>
                    <div class="review-detail">
                      <span>📅 <strong>Indsendt:</strong> ${new Date().toLocaleString('da-DK')}
                    </div>
                  </div>
                  
                  ${message ? `
                  <div class="message-section">
                    <p><strong>Brugerens besked:</strong></p>
                    <p>"${message}"</p>
                  </div>
                  ` : ''}
                  
                  ${conversationMessages && conversationMessages.length > 0 ? `
                  <div class="conversation-section">
                    <div class="conversation-title">💬 Samtale med AI-assistenten</div>
                    ${conversationMessages.map(msg => `
                      <div class="message-item ${msg.type === 'user' ? 'user' : 'assistant'}">
                        <div class="message-sender">${msg.type === 'user' ? 'Bruger' : 'AI Assistant'}</div>
                        <div class="message-content">${msg.content}</div>
                      </div>
                    `).join('')}
                  </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/manual-reviews" class="button">
                      Gennemgå anmodning
                    </a>
                  </div>
                  
                  <hr class="divider" />
                  
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; font-size: 14px; color: #92400e;">
                    <strong>⚠️ Handling påkrævet:</strong> Gennemgå venligst denne anmodning i admin dashboardet og svar brugeren inden for 24 timer.
                  </div>
                </div>
                
                <div class="footer">
                  <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/Elva%20Logo%20Icon%202.png" alt="Elva Solutions" class="footer-logo" />
                  <div>
                    <strong>Elva Solutions</strong>
                    <p>AI-drevet kundeservice</p>
                    <p>Dette er en automatisk notifikation. Svar ikke på denne email.</p>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Failed to send manual review email:', error);
      throw error;
    }

    console.log('✅ Manual review email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending manual review email:', error);
    throw error;
  }
}

/**
 * Send team invitation email
 */
export async function sendInvitationEmail({
  email,
  organizationName,
  inviterName,
  token,
  role
}) {
  try {
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/${token}`;

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Elva Solutions <onboarding@resend.dev>',
      to: [email],
      subject: `Du er inviteret til at deltage i ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation - Elva Solutions</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f9fafb;
              }
              .email-wrapper {
                background-color: #f9fafb;
                padding: 40px 20px;
              }
              .email-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .logo-container {
                background: white;
                width: 80px;
                height: 80px;
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              }
              .logo {
                width: 50px;
                height: 50px;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                color: white;
                font-weight: 700;
              }
              .header p {
                margin: 10px 0 0;
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
              }
              .content {
                padding: 40px 30px;
                color: #374151;
              }
              .invitation-card {
                background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
                border-radius: 12px;
                padding: 24px;
                margin: 24px 0;
                border: 1px solid #e0e7ff;
              }
              .invitation-detail {
                display: flex;
                align-items: center;
                margin: 12px 0;
                font-size: 15px;
              }
              .invitation-detail strong {
                color: #1f2937;
              }
              .role-badge {
                display: inline-block;
                padding: 6px 14px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                text-transform: capitalize;
                margin-left: 8px;
              }
              .button {
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 16px;
                margin: 24px 0;
                box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);
                transition: transform 0.2s;
              }
              .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.5);
              }
              .link-section {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
                border: 1px solid #e5e7eb;
              }
              .link-section p {
                margin: 0;
                font-size: 13px;
                color: #6b7280;
              }
              .link-section a {
                color: #3b82f6;
                word-break: break-all;
                text-decoration: none;
              }
              .divider {
                border: none;
                border-top: 2px solid #f3f4f6;
                margin: 32px 0;
              }
              .notice {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                border-radius: 6px;
                font-size: 14px;
                color: #92400e;
              }
              .footer {
                background: #1f2937;
                padding: 30px;
                text-align: center;
                color: #9ca3af;
              }
              .footer-logo {
                width: 40px;
                height: 40px;
                margin-bottom: 12px;
              }
              .footer strong {
                color: #f3f4f6;
                font-size: 16px;
              }
              .footer p {
                margin: 8px 0;
                font-size: 13px;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="header">
                  <div class="logo-container" style="margin-bottom: 12px;">
                    <img src="https://elva-agents.vercel.app/images/Elva%20Logo%20Icon%202.svg" alt="Elva Solutions" class="logo" />
                  </div>
                  <h1>Du er inviteret! 🎉</h1>
                  <p>Deltag i dit team på Elva Solutions</p>
                </div>
                
                <div class="content">
                  <p style="font-size: 16px; margin-bottom: 24px;">Hej,</p>
                  
                  <p style="font-size: 16px;"><strong>${inviterName}</strong> har inviteret dig til at deltage i deres team på Elva Solutions.</p>
                  
                  <div class="invitation-card">
                    <div class="invitation-detail">
                      <span>📋 <strong>Organisation:</strong> ${organizationName}</span>
                    </div>
                    <div class="invitation-detail">
                      <span>👤 <strong>Din rolle:</strong></span>
                      <span class="role-badge">${role}</span>
                    </div>
                    <div class="invitation-detail">
                      <span>⏰ <strong>Udløber:</strong> Om 7 dage</span>
                    </div>
                  </div>
                  
                  <p style="font-size: 15px; color: #6b7280;">Klik på knappen nedenfor for at acceptere din invitation og begynde at samarbejde med dit team:</p>
                  
                  <center>
                    <a href="${invitationUrl}" class="button">✨ Accepter invitation</a>
                  </center>
                  
                  <div class="link-section">
                    <p>Eller kopier og indsæt dette link i din browser:</p>
                    <a href="${invitationUrl}">${invitationUrl}</a>
                  </div>
                  
                  <hr class="divider">
                  
                  <div class="notice">
                    <strong>⚡ Ny på Elva Solutions?</strong><br>
                    Intet problem! Du kan oprette din konto direkte når du accepterer denne invitation. Det tager kun et minut.
                  </div>
                  
                  <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">
                    Hvis du ikke forventede denne invitation, kan du trygt ignorere denne email. Invitationen udløber automatisk efter 7 dage.
                  </p>
                </div>
                
                <div class="footer">
                  <a href="https://www.elva-solutions.com"><img src="https://elva-agents.vercel.app/images/Elva%20Logo%20Icon%202.svg" alt="Elva Solutions" class="footer-logo" /></a>
                  <p><strong><a href="https://www.elva-solutions.com" style="color: #f3f4f6; text-decoration: underline; transition: opacity 0.2s; opacity: 0.9;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">Elva Solutions</a></strong></p>
                  <p>AI-drevet chat widgets til din virksomhed</p>
                  <p style="margin-top: 16px; font-size: 12px;">
                    © ${new Date().getFullYear()} Elva Solutions. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
🎉 DU ER INVITERET TIL AT DELTAGE I ${organizationName.toUpperCase()}!

Hej,

${inviterName} har inviteret dig til at deltage i deres team på Elva Solutions.

INVITATIONSDETALJER:
- Organisation: ${organizationName}
- Din rolle: ${role}
- Udløber: Om 7 dage

Accepter din invitation ved at klikke på dette link:
${invitationUrl}

⚡ NY PÅ ELVA SOLUTIONS?
Intet problem! Du kan oprette din konto direkte når du accepterer denne invitation. 
Det tager kun et minut.

---

Denne invitation udløber om 7 dage. Hvis du ikke forventede denne invitation, 
kan du trygt ignorere denne email.

---
ELVA SOLUTIONS
AI-drevet chat widgets til din virksomhed
© ${new Date().getFullYear()} Elva Solutions. Alle rettigheder forbeholdes.
      `.trim()
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }

    console.log('✅ Invitation email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}

/**
 * Send welcome email to new team member
 */
export async function sendWelcomeEmail({
  email,
  name,
  organizationName,
  role
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Elva Solutions <onboarding@resend.dev>',
      to: [email],
      subject: `Velkommen til ${organizationName}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Velkommen til ${organizationName} - Elva Solutions</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f9fafb;
              }
              .email-wrapper {
                background-color: #f9fafb;
                padding: 40px 20px;
              }
              .email-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .logo-container {
                background: white;
                width: 80px;
                height: 80px;
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              }
              .logo {
                width: 50px;
                height: 50px;
              }
              .content {
                padding: 40px 30px;
              }
              .button {
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 16px;
                margin: 24px 0;
                box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);
              }
              .footer {
                background: #1f2937;
                padding: 30px;
                text-align: center;
                color: #9ca3af;
              }
              .footer-logo {
                width: 40px;
                height: 40px;
                margin-bottom: 12px;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="header">
                  <div class="logo-container">
                    <img src="https://elva-agents.vercel.app/images/Elva%20Logo%20Icon%202.svg" alt="Elva Solutions" class="logo" />
                  </div>
                  <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">Velkommen ombord! 🎉</h1>
                  <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Du er nu en del af ${organizationName}</p>
                </div>
                
                <div class="content">
                  <p style="font-size: 16px;">Hej ${name},</p>
                  
                  <p style="font-size: 16px;">Du har succesfuldt deltaget i <strong>${organizationName}</strong> som <strong>${role}</strong>. Velkommen til teamet! 🚀</p>
                  
                  <p style="font-size: 15px; color: #6b7280;">Du kan nu tilgå dit dashboard og begynde at samarbejde med dit team:</p>
                  
                  <center>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" class="button">
                      🎯 Gå til dashboard
                    </a>
                  </center>
                  
                  <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #dbeafe;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">
                      <strong>💡 Hurtigt tip:</strong> Udforsk dashboardet for at oprette AI-drevne chat widgets, se analytics og samarbejde med dine teammedlemmer.
                    </p>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">Hvis du har spørgsmål, er du velkommen til at kontakte din team admin eller tjekke vores dokumentation.</p>
                  
                  <p style="font-size: 16px; margin-top: 32px;">Godt arbejde! ✨</p>
                </div>
                
                <div class="footer">
                  <img src="https://elva-agents.vercel.app/images/Elva%20Logo%20Icon%202.svg" alt="Elva Solutions" class="footer-logo" />
                  <p><strong style="color: #f3f4f6; font-size: 16px;">Elva Solutions</strong></p>
                  <p style="margin: 8px 0; font-size: 13px;">AI-drevet chat widgets til din virksomhed</p>
                  <p style="margin-top: 16px; font-size: 12px;">
                    © ${new Date().getFullYear()} Elva Solutions. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Velkommen til ${organizationName}!

Hej ${name},

Du har succesfuldt deltaget i ${organizationName} som ${role}. Velkommen til teamet!

Du kan nu tilgå dit dashboard og begynde at samarbejde:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin

Hvis du har spørgsmål, er du velkommen til at kontakte din team admin.

Godt arbejde!

---
Drevet af Elva Solutions
AI-drevet chat widgets til din virksomhed
      `.trim()
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - welcome email is not critical
  }
}

