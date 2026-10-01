/**
 * SMS Service Abstraction Layer
 * Supports: mock (dev), twilio, vonage
 * Configure via SMS_PROVIDER environment variable
 */

export interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

async function sendViaTwilio(phone: string, message: string): Promise<SMSResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
        return { success: false, error: 'Twilio credentials not configured' };
    }

    const formattedPhone = phone.startsWith('0') ? `+2${phone}` : phone;

    const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: formattedPhone,
                From: fromPhone,
                Body: message,
            }),
        }
    );

    const data = await response.json();
    if (data.sid) {
        return { success: true, messageId: data.sid };
    }
    return { success: false, error: data.message || 'Failed to send SMS' };
}

async function sendViaVonage(phone: string, message: string): Promise<SMSResult> {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const from = process.env.VONAGE_FROM || 'Tawfeek';

    if (!apiKey || !apiSecret) {
        return { success: false, error: 'Vonage credentials not configured' };
    }

    const formattedPhone = phone.startsWith('0') ? `2${phone}` : phone;

    const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            api_secret: apiSecret,
            to: formattedPhone,
            from,
            text: message,
        }),
    });

    const data = await response.json();
    const msg = data.messages?.[0];
    if (msg?.status === '0') {
        return { success: true, messageId: msg['message-id'] };
    }
    return { success: false, error: msg?.['error-text'] || 'Failed to send SMS' };
}

async function sendViaMock(phone: string, message: string): Promise<SMSResult> {
    // In development: log OTP to console
    console.log(`\n=== SMS (MOCK MODE) ===`);
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`======================\n`);
    return { success: true, messageId: `mock-${Date.now()}` };
}

export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
    const provider = process.env.SMS_PROVIDER || 'mock';

    switch (provider) {
        case 'twilio':
            return sendViaTwilio(phone, message);
        case 'vonage':
            return sendViaVonage(phone, message);
        case 'mock':
        default:
            return sendViaMock(phone, message);
    }
}

export async function sendOTP(phone: string, otp: string): Promise<SMSResult> {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'التوفيق';
    const message = `كود التحقق الخاص بك في ${appName} هو: ${otp}\nلا تشارك هذا الكود مع أي شخص.\nصالح لمدة 10 دقائق.`;
    return sendSMS(phone, message);
}
