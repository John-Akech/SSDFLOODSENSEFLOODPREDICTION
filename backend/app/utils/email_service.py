from typing import List
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_alert_email(recipients: List[str], subject: str, body: str) -> bool:
        """Send email alert via SMTP service
        
        PRODUCTION POLICY: Returns False if SMTP not configured.
        No silent success - accurate reporting required.
        
        Environment Variables Required:
            SMTP_HOST: SMTP server host (e.g., smtp.gmail.com, smtp.sendgrid.net)
            SMTP_PORT: SMTP server port (587 for TLS, 465 for SSL)
            SMTP_USER: SMTP username
            SMTP_PASSWORD: SMTP password or API key
            SMTP_FROM: Sender email address
            SMTP_USE_TLS: Use TLS (default: true)
        
        Supported Providers:
            - Gmail: smtp.gmail.com:587 (requires app password)
            - SendGrid: smtp.sendgrid.net:587 (API key as password)
            - AWS SES: email-smtp.region.amazonaws.com:587
            - Mailgun: smtp.mailgun.org:587
        """
        try:
            # Check if SMTP is configured
            smtp_host = os.getenv("SMTP_HOST")
            smtp_port = os.getenv("SMTP_PORT", "587")
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            smtp_from = os.getenv("SMTP_FROM")
            smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
            
            if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
                logger.warning(
                    f"Email alert NOT sent to {len(recipients)} recipients - SMTP not configured: {subject}"
                )
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_from
            msg['To'] = ', '.join(recipients)
            
            # Add HTML and plain text parts
            html_body = f"""
<html>
  <body>
    <h2>🚨 South Sudan Flood Alert</h2>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
      {body}
    </div>
    <br>
    <p style="color: #666; font-size: 12px;">
      This is an automated alert from the South Sudan Flood Sense system.
    </p>
  </body>
</html>
            """
            
            msg.attach(MIMEText(body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email via SMTP
            try:
                port = int(smtp_port)
                
                if smtp_use_tls and port == 587:
                    # TLS connection (recommended)
                    with smtplib.SMTP(smtp_host, port, timeout=10) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                        
                elif port == 465:
                    # SSL connection
                    with smtplib.SMTP_SSL(smtp_host, port, timeout=10) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                        
                else:
                    # No encryption (not recommended for production)
                    with smtplib.SMTP(smtp_host, port, timeout=10) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                
                logger.info(f"Email alert sent to {len(recipients)} recipients: {subject}")
                return True
                
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"SMTP authentication failed: {e} - Check SMTP_USER and SMTP_PASSWORD")
                return False
                
            except smtplib.SMTPException as e:
                logger.error(f"SMTP error: {e}")
                return False
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    @staticmethod
    async def send_verification_email(email: str, token: str) -> bool:
        """Send email verification link
        
        PRODUCTION POLICY: Returns False if SMTP not configured.
        """
        try:
            smtp_host = os.getenv("SMTP_HOST")
            smtp_port = os.getenv("SMTP_PORT", "587")
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            smtp_from = os.getenv("SMTP_FROM")
            smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
            
            if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
                logger.warning(f"Verification email NOT sent to {email} - SMTP not configured")
                return False
            
            # Create verification link
            base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            verification_link = f"{base_url}/verify-email?token={token}"
            
            subject = "Verify Your South Sudan Flood Sense Account"
            body = f"""
Hello,

Thank you for registering with South Sudan Flood Sense!

Please verify your email address by clicking the link below:
{verification_link}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
South Sudan Flood Sense Team
            """
            
            html_body = f"""
<html>
  <body>
    <h2>Verify Your Email Address</h2>
    <p>Thank you for registering with South Sudan Flood Sense!</p>
    <p>Please verify your email address by clicking the button below:</p>
    <div style="margin: 20px 0;">
      <a href="{verification_link}" 
         style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color: #666; font-size: 12px;">
      Or copy and paste this link into your browser:<br>
      {verification_link}
    </p>
    <p style="color: #666; font-size: 12px;">
      This link will expire in 24 hours.
    </p>
  </body>
</html>
            """
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_from
            msg['To'] = email
            
            msg.attach(MIMEText(body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            try:
                port = int(smtp_port)
                
                if smtp_use_tls and port == 587:
                    with smtplib.SMTP(smtp_host, port, timeout=10) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                elif port == 465:
                    with smtplib.SMTP_SSL(smtp_host, port, timeout=10) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, port, timeout=10) as server:
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                
                logger.info(f"Verification email sent to {email}")
                return True
                
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"SMTP authentication failed: {e}")
                return False
                
            except smtplib.SMTPException as e:
                logger.error(f"SMTP error: {e}")
                return False
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return False
