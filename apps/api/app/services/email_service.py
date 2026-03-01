"""
Email service for sending transactional emails (invite links, etc.)
Uses smtplib with STARTTLS — works with Gmail App Passwords, Mailgun SMTP, etc.

Required env vars:
    SMTP_HOST      e.g. smtp.gmail.com
    SMTP_PORT      defaults to 587
    SMTP_USER      e.g. yourapp@gmail.com
    SMTP_PASSWORD  App Password or SMTP API key
    SMTP_FROM      display name + address, e.g. "PortfolioAI <noreply@yourapp.com>"
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def send_invite_email(
    to_email: str,
    to_name: str,
    manager_name: str,
    invite_url: str,
) -> bool:
    """
    Send a client invite email with the acceptance link.
    Returns True on success, False if SMTP is not configured or sending fails.
    """
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_password, settings.smtp_from]):
        print("SMTP not configured — skipping invite email")
        return False

    subject = f"You've been invited to PortfolioAI by {manager_name}"

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px;">
    <h2 style="color: #1a1a1a; margin-top: 0;">Welcome to PortfolioAI</h2>
    <p style="color: #555;">Hi {to_name},</p>
    <p style="color: #555;">
      <strong>{manager_name}</strong> has invited you to join PortfolioAI to track
      and manage your investments together.
    </p>
    <p style="color: #555;">Click the button below to accept your invite and set up your account.</p>
    <a href="{invite_url}"
       style="display: inline-block; margin-top: 16px; padding: 12px 28px;
              background: #4F8CFF; color: #fff; text-decoration: none;
              border-radius: 8px; font-weight: 600; font-size: 15px;">
      Accept Invite
    </a>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      This invite expires in 7 days. If you did not expect this invitation, you can ignore this email.
    </p>
    <p style="color: #bbb; font-size: 11px; margin-top: 8px;">
      Or copy this link: {invite_url}
    </p>
  </div>
</body>
</html>
"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = f"{to_name} <{to_email}>"
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())

        print(f"Invite email sent to {to_email}")
        return True

    except Exception as e:
        print(f"Warning: Failed to send invite email to {to_email}: {e}")
        return False
