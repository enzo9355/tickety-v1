import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email
from dotenv import load_dotenv

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")

def send_task_created_email(to_email: str, target_url: str):
    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("SendGrid credentials are not configured properly.")
        return False
        
    message = Mail(
        from_email=Email(SENDER_EMAIL, "Tickety 售票通知"),
        to_emails=to_email,
        subject="【Tickety】追蹤任務建立成功！",
        html_content=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #b026ff;">Tickety 售票追蹤與推薦系統</h2>
            <p>您好，</p>
            <p>您已成功啟動售票監控任務。我們將在背景為您持續追蹤以下網址：</p>
            <p><strong><a href="{target_url}" style="color: #00aaff;">{target_url}</a></strong></p>
            <p>一旦偵測到票券釋出，我們將立即透過此 Email 通知您。</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">此為系統自動發送之信件，請勿直接回覆。</p>
        </div>
        """
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Email sent to {to_email} with status code: {response.status_code}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def send_ticket_alert(to_email: str, ticket_url: str):
    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("SendGrid credentials are not configured properly.")
        return False
        
    message = Mail(
        from_email=Email(SENDER_EMAIL, "Tickety 售票通知"),
        to_emails=to_email,
        subject="🎫 釋票通知！你追蹤的票券有動態了",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0b0f17;color:#fff;padding:40px;border-radius:16px;">
            <h2 style="color:#a78bfa;">🎫 Tickety 釋票通知</h2>
            <p>你追蹤的票券頁面偵測到有票可購買！</p>
            <p style="color:#94a3b8;">請盡快前往搶購，票券可能隨時售完。</p>
            <a href="{ticket_url}"
               style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">
               立即前往購票 →
            </a>
            <p style="margin-top:30px;color:#475569;font-size:12px;">此通知由 Tickety 自動發送，任務已自動停止監控。</p>
        </div>
        """
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Alert email sent to {to_email} with status code: {response.status_code}")
        return True
    except Exception as e:
        print(f"Failed to send alert email: {e}")
        return False
