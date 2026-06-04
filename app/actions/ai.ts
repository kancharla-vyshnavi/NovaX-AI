"use server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

function parseRelativeDateTimeLocal(input: string): string {
	const now = new Date();
	const targetDate = new Date(now);
	const text = input.toLowerCase().trim();

	// 1. Check for relative minutes: e.g. "in 10 minutes", "10 mins", "10 मिनट", "10 ನಿಮಿಷ"
	const minutesMatch = text.match(/(?:in|after)?\s*(\d+)\s*(?:minute|min|mins|मिनट|ನಿಮಿಷ|ನಿಮಿಷಗಳು|நிமிடங்கள்|నిమిషాలు)/);
	if (minutesMatch) {
		const mins = parseInt(minutesMatch[1]);
		targetDate.setMinutes(targetDate.getMinutes() + mins);
		return targetDate.toISOString();
	}

	// 2. Check for relative hours: e.g. "in 2 hours", "2 hrs", "2 घंटे", "2 ಗಂಟೆ"
	const hoursMatch = text.match(/(?:in|after)?\s*(\d+)\s*(?:hour|hr|hrs|घंटे|ಗಂಟೆ|ಗಂಟೆಗಳು|மணிநேரம்|గంటలు)/);
	if (hoursMatch) {
		const hrs = parseInt(hoursMatch[1]);
		targetDate.setHours(targetDate.getHours() + hrs);
		return targetDate.toISOString();
	}

	// e.g. "in an hour" / "एक घंटे में"
	if (text.includes("in an hour") || text.includes("after an hour") || text.includes("एक घंटे में")) {
		targetDate.setHours(targetDate.getHours() + 1);
		return targetDate.toISOString();
	}

	// 3. Check for weekdays:
	const sundayRegex = /sunday|रविवार|ఆదివారం|ஞாயிற்றுக்கிழமை|ಭಾನುವಾರ/i;
	const mondayRegex = /monday|सोमवार|సోమవారం|திங்கட்கிழமை|ಸೋಮವಾರ/i;
	const tuesdayRegex = /tuesday|मंगलवार|మంగళవారం|செவ்வாய்க்கிழமை|ಮಂಗಳವಾರ/i;
	const wednesdayRegex = /wednesday|बुधवार|బుధవారం|ಬುಧವಾರ|புதன்கிழமை/i;
	const thursdayRegex = /thursday|गुरुवार|గురువారం|வியாழக்கிழமை|ಗುರುವಾರ/i;
	const fridayRegex = /friday|शुक्रवार|శుక్రవారం|வெள்ளிக்கிழமை|ಶುಕ್ರವಾರ/i;
	const saturdayRegex = /saturday|शनिवार|శనివారం|சனிக்கிழமை|ಶನಿವಾರ/i;

	let weekdayIndex = -1;
	if (sundayRegex.test(text)) weekdayIndex = 0;
	else if (mondayRegex.test(text)) weekdayIndex = 1;
	else if (tuesdayRegex.test(text)) weekdayIndex = 2;
	else if (wednesdayRegex.test(text)) weekdayIndex = 3;
	else if (thursdayRegex.test(text)) weekdayIndex = 4;
	else if (fridayRegex.test(text)) weekdayIndex = 5;
	else if (saturdayRegex.test(text)) weekdayIndex = 6;

	if (weekdayIndex !== -1) {
		const currentDay = now.getDay();
		let daysToAdd = weekdayIndex - currentDay;
		if (daysToAdd <= 0) {
			daysToAdd += 7; // Next week
		}
		if ((text.includes("next ") || text.includes("अगले") || text.includes("తదుపరి") || text.includes("அடுத்த") || text.includes("ಮುಂದಿನ")) && daysToAdd < 7) {
			daysToAdd += 7;
		}
		targetDate.setDate(targetDate.getDate() + daysToAdd);
	} else if (text.includes("tomorrow") || text.includes("कल") || text.includes("రేపు") || text.includes("நாளை") || text.includes("ನಾಳೆ")) {
		targetDate.setDate(targetDate.getDate() + 1);
	} else if (text.includes("day after tomorrow") || text.includes("परसों") || text.includes("ఎల్లుండి") || text.includes("நாளை மறுநாள்") || text.includes("ನಾಡಿದ್ದು")) {
		targetDate.setDate(targetDate.getDate() + 2);
	}

	// 4. Parse time details: e.g. "at 8 am", "8pm", "9:30 pm", "8 बजे", "8 గంటలకు", "8 மணிக்கு"
	let hours = 9; // Default: 9 AM
	let minutes = 0;
	let ampm = "";

	const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|बजे|గంటలకు|மணிக்கு|ಗಂಟೆಗೆ)?/);
	if (timeMatch) {
		hours = parseInt(timeMatch[1]);
		if (timeMatch[2]) {
			minutes = parseInt(timeMatch[2]);
		}
		if (timeMatch[3]) {
			const matchedSuffix = timeMatch[3];
			if (matchedSuffix === "pm") {
				ampm = "pm";
			} else if (matchedSuffix === "am") {
				ampm = "am";
			} else {
				// For Indian language time words, assume PM if it's evening context, otherwise AM
				if (text.includes("shyam") || text.includes("शाम") || text.includes("रात") || text.includes("సాయంత్రం") || text.includes("రాత్రి") || text.includes("மாலை") || text.includes("இரவு") || text.includes("ಸಂಜೆ") || text.includes("ರಾತ್ರಿ")) {
					ampm = "pm";
				} else {
					ampm = "am";
				}
			}
		} else {
			// Infer AM/PM if not provided
			if (text.includes("morning") || text.includes("सुबह") || text.includes("ఉదయం") || text.includes("காலை") || text.includes("ಬೆಳಿಗ್ಗೆ")) ampm = "am";
			else if (text.includes("evening") || text.includes("night") || text.includes("afternoon") || text.includes("शाम") || text.includes("रात") || text.includes("సాయంత్రం") || text.includes("రాత్రి") || text.includes("மாலை") || text.includes("இரவு") || text.includes("ಸಂಜೆ") || text.includes("ರಾತ್ರಿ")) ampm = "pm";
		}

		if (ampm === "pm" && hours < 12) {
			hours += 12;
		} else if (ampm === "am" && hours === 12) {
			hours = 0;
		}
	} else if (text.includes("noon") || text.includes("दोपहर")) {
		hours = 12;
		minutes = 0;
	} else if (text.includes("midnight") || text.includes("आधी रात")) {
		hours = 0;
		minutes = 0;
	} else if (text.includes("morning") || text.includes("सुबह") || text.includes("ఉదయం") || text.includes("காலை") || text.includes("ಬೆಳಿಗ್ಗೆ")) {
		hours = 8;
		minutes = 0;
	} else if (text.includes("afternoon") || text.includes("दोपहर")) {
		hours = 14;
		minutes = 0;
	} else if (text.includes("evening") || text.includes("शाम") || text.includes("సాయంత్రం") || text.includes("மாலை") || text.includes("ಸಂಜೆ")) {
		hours = 18;
		minutes = 0;
	} else if (text.includes("night") || text.includes("रात") || text.includes("రాత్రి") || text.includes("இரவு") || text.includes("ರಾತ್ರಿ")) {
		hours = 20;
		minutes = 0;
	} else {
		// Default to relative add if no specific time is matched
		if (weekdayIndex === -1 && !text.includes("tomorrow") && !text.includes("कल") && !text.includes("రేపు") && !text.includes("நாளை") && !text.includes("ನಾಳೆ")) {
			targetDate.setHours(targetDate.getHours() + 1);
			return targetDate.toISOString();
		}
	}

	targetDate.setHours(hours, minutes, 0, 0);

	// If the time has already passed today and no specific date/day was specified, move it to tomorrow
	if (targetDate < now && weekdayIndex === -1 && !text.includes("tomorrow") && !text.includes("कल") && !text.includes("today") && !text.includes("आज")) {
		targetDate.setDate(targetDate.getDate() + 1);
	}

	return targetDate.toISOString();
}

export const getDate = async (datetime: string) => {
	const apiKey = process.env.OPENAI_API_KEY;

	if (!apiKey) {
		console.log("[Mock AI] No OpenAI API Key found. Parsing date locally:", datetime);
		return parseRelativeDateTimeLocal(datetime);
	}

	try {
		const model = openai("gpt-4o-mini");
		const currentDateTime = new Date().toISOString();

		const { text } = await generateText({
			model: model,
			prompt: `Convert the relative datetime expression to an absolute datetime in ISO format (YYYY-MM-DDTHH:mm:ssZ).
        Current time is: ${currentDateTime}
        Input datetime: ${datetime}
        
        Only return the datetime in ISO format (YYYY-MM-DDTHH:mm:ssZ). For example:
        - If input is "today at 2pm" and current time is "2024-03-20T10:30:00Z", return "2024-03-20T14:00:00Z"
        - If input is "after 10 mins" and current time is "2024-03-20T10:30:00Z", return "2024-03-20T10:40:00Z"
        - If input is "tomorrow morning at 9am" and current time is "2024-03-20T23:30:00Z", return "2024-03-21T09:00:00Z"
        - If input is "next monday 3pm" and current time is "2024-03-20T10:30:00Z", return "2024-03-25T15:00:00Z"`,
		});

		return text;
	} catch (error) {
		console.warn("Failed to generate text from OpenAI. Falling back to local date parser.", error);
		return parseRelativeDateTimeLocal(datetime);
	}
};
