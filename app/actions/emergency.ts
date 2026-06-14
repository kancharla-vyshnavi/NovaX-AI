"use server";

export async function triggerEmergencyAction(toPhone?: string) {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
	const fallbackToNumber = process.env.TWILIO_TO_NUMBER || process.env.TWILIO_TO_PHONE_NUMBER;
	const toNumber = toPhone || fallbackToNumber;

	const isConfigured = !!(accountSid && authToken && fromNumber && toNumber);

	if (!isConfigured) {
		return { success: false, error: "Twilio not configured" };
	}

	try {
		const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
		const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
		
		const response = await fetch(twilioUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": `Basic ${auth}`
			},
			body: new URLSearchParams({
				From: fromNumber!,
				To: toNumber!,
				Body: "Emergency SOS: Caregiver alert triggered from VoiceCare dashboard."
			}).toString()
		});

		if (!response.ok) {
			const errText = await response.text();
			console.error("Twilio send message failed:", errText);
			return { success: false, error: `Twilio error: ${response.statusText}` };
		}

		return { success: true };
	} catch (error: any) {
		console.error("Emergency alert action failed:", error);
		return { success: false, error: error.message || "Unknown error" };
	}
}
