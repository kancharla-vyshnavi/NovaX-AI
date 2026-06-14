"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
	FaBell,
	FaCalendarAlt,
	FaComments,
	FaMicrophone,
	FaPhoneAlt,
	FaCog,
	FaTimes,
	FaExclamationTriangle,
	FaSync,
	FaTrash,
	FaGlobe,
	FaVolumeUp,
	FaCheck,
	FaPaperPlane,
} from "react-icons/fa";
import { toast } from "sonner";
import { getDate } from "./actions/ai";
import { getWeatherAction } from "./actions/weather";
import { triggerEmergencyAction } from "./actions/emergency";
import { AudioWave } from "./components/AudioWave";
import countries from "world-countries";
import { Country, State, City } from "country-state-city";
// import { useNotifications } from "@/hooks/useNotifications";

// Types
interface Message {
	sender: "user" | "novax";
	text: string;
	timestamp: Date;
	isConfirmation?: boolean;
}

interface TaskItem {
	id?: string;
	task_id?: number | string;
	title: string;
	type: "reminder" | "appointment";
	event_time: Date;
}

interface LocationItem {
	id: string;
	name: string;
	city: string;
	country: string;
	timezone: string;
}

// LOCATIONS hardcoded list removed (using country-state-city now)

const sortedCountries = [...countries].sort((a, b) => a.name.common.localeCompare(b.name.common));

const phoneCodes = sortedCountries.map(c => {
	const dialCode = c.idd.root + (c.idd.suffixes && c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : "");
	return {
		cca2: c.cca2,
		name: c.name.common,
		flag: c.flag,
		dialCode: dialCode || ""
	};
}).filter(c => c.dialCode !== "")
  .sort((a, b) => a.name.localeCompare(b.name));




// Safe DateTime Formatting Helper
const formatDateTimeReadable = (dateTime: any) => {
	if (!dateTime) return "No date/time set";
	const date = new Date(dateTime);
	if (isNaN(date.getTime())) {
		return String(dateTime);
	}
	return date.toLocaleString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
};

// 9-Language Localization Dictionary
const DICTIONARY: Record<string, Record<string, string>> = {
	"en-US": {
		welcome: "Hello, I am NovaX AI, your intelligent personal assistant.",
		confirm_reminder: "Permission required before proceeding. Do you want me to set a medication reminder to {task} for {time}? Would you like me to continue?",
		confirm_appointment: "Permission required before proceeding. Do you want me to schedule your appointment for {title} on {time}? Awaiting your confirmation.",
		confirm_music: "Permission required before proceeding. Do you want me to play soothing classical music? Would you like me to continue?",
		confirm_stop_music: "Permission required before proceeding. Do you want me to stop playing the music? Awaiting your confirmation.",
		confirm_sos: "Permission required before proceeding. Do you want me to activate the emergency SOS protocol? Awaiting your confirmation.",
		cancel: "Action cancelled. Awaiting your next instructions.",
		executed_reminder: "Action executed. Medication reminder to {task} set for {time}.",
		executed_appointment: "Action executed. Appointment for {title} scheduled for {time}.",
		executed_music: "Action executed. Soothing classical music is now active.",
		executed_stop_music: "Action executed. Music playback has been terminated.",
		executed_sos: "Emergency SOS has been dispatched. Please stay calm.",
		weather: "The current meteorological metrics indicate seventy-two degrees and clear sunny conditions with mild wind velocity.",
		time: "The current system time is {time}.",
		joke: "Why don't scientists trust atoms? Because they make up everything!",
		speak_fail: "I encountered an error processing your query. Could you please repeat that?",
		unclear: "I didn't catch that clearly. Could you please repeat?",
		confirm_open: "Do you want me to open {site}?",
		executed_open: "Action executed. Opening {site} in a new tab."
	},
	"hi-IN": {
		welcome: "नमस्ते, मैं नोवा एक्स एआई हूँ, आपका बुद्धिमान व्यक्तिगत सहायक।",
		confirm_reminder: "आगे बढ़ने से पहले अनुमति की आवश्यकता है। क्या आप चाहते हैं कि मैं {time} पर {task} के लिए एक अनुस्मारक सेट करूँ? क्या आप जारी रखना चाहते हैं?",
		confirm_appointment: "आगे बढ़ने से पहले अनुमति की आवश्यकता है। क्या आप चाहते हैं कि मैं {time} पर {title} के लिए आपकी नियुक्ति निर्धारित करूँ? आपकी पुष्टि की प्रतीक्षा है।",
		confirm_music: "आगे बढ़ने से पहले अनुमति की आवश्यकता है। क्या आप चाहते हैं कि मैं सुखदायक शास्त्रीय संगीत बजाऊं? क्या आप जारी रखना चाहते हैं?",
		confirm_stop_music: "आगे बढ़ने से पहले अनुमति की आवश्यकता है। क्या आप चाहते हैं कि मैं संगीत बंद कर दूं? आपकी पुष्टि की प्रतीक्षा है।",
		confirm_sos: "आगे बढ़ने से पहले अनुमति की आवश्यकता है। क्या आप चाहते हैं कि मैं आपातकालीन एसओएस प्रोटोकॉल सक्रिय करूं? आपकी पुष्टि की प्रतीक्षा है।",
		cancel: "कार्रवाई रद्द कर दी गई। आपके अगले निर्देशों की प्रतीक्षा है।",
		executed_reminder: "कार्रवाई पूरी हुई। {time} पर {task} के लिए अनुस्मारक सेट किया गया है।",
		executed_appointment: "कार्रवाई पूरी हुई। {time} पर {title} के लिए नियुक्ति निर्धारित की गई है।",
		executed_music: "कार्रवाई पूरी हुई। सुखदायक शास्त्रीय संगीत अब सक्रिय है।",
		executed_stop_music: "कार्रवाई पूरी हुई। संगीत प्लेबैक बंद कर दिया गया है।",
		executed_sos: "आपातकालीन एसओएस भेज दिया गया है। कृपया शांत रहें।",
		weather: "मौसम बहुत अच्छा है। यह वर्तमान में बहत्तर डिग्री और धूप है।",
		time: "वर्तमान समय {time} है।",
		joke: "वैज्ञानिक परमाणुओं पर भरोसा क्यों नहीं करते? क्योंकि वे सब कुछ बनाते हैं।",
		speak_fail: "मुझे आपके प्रश्न को संसाधित करने में त्रुटि हुई। क्या आप कृपया उसे दोहरा सकते हैं?",
		unclear: "मैं स्पष्ट रूप से सुन नहीं पाया। क्या आप कृपया दोहरा सकते हैं?",
		confirm_open: "क्या आप चाहते हैं कि मैं {site} खोलूं?",
		executed_open: "कार्रवाई पूरी हुई। {site} को नए टैब में खोला जा रहा है।"
	},
	"te-IN": {
		welcome: "నమస్కారం, నేను నోవా ఎక్స్ ఐ, మీ తెలివైన వ్యక్తిగత సహాయకుడిని.",
		confirm_reminder: "కొనసాగడానికి ముందు అనుమతి అవసరం. నేను {time} కి {task} కొరకు రిమైండర్ సెట్ చేయాలా? మీరు కొనసాగించాలనుకుంటున్నారా?",
		confirm_appointment: "కొనసాగడానికి ముందు అనుమతి అవసరం. నేను {time} కి {title} కొరకు అపాయింట్‌మెంట్ షెడ్యూల్ చేయాలా? మీ నిర్ధారణ కోసం ఎదురుచూస్తున్నాను.",
		confirm_music: "కొనసాగడానికి ముందు అనుమతి అవసరం. నేను ప్రశాంతమైన శాస్త్రీయ సంగీతాన్ని ప్లే చేయాలా? మీరు కొనసాగించాలనుకుంటున్నారా?",
		confirm_stop_music: "కొనసాగడానికి ముందు అనుమతి అవసరం. నేను సంగీతాన్ని ఆపివేయాలా? మీ నిర్ధారణ కోసం ఎదురుచూస్తున్నాను.",
		confirm_sos: "కొనసాగడానికి ముందు అనుమతి అవసరం. నేను అత్యవసర SOS ప్రోటోకాల్‌ను సక్రియం చేయాలా? మీ నిర్ధారణ కోసం ఎదురుచూస్తున్నాను.",
		cancel: "చర్య రద్దు చేయబడింది. మీ తదుపరి సూచనల కోసం ఎదురుచూస్తున్నాను.",
		executed_reminder: "చర్య విజయవంతమైంది. {time} కి {task} కొరకు రిమైండర్ సెట్ చేయబడింది.",
		executed_appointment: "చర్య విజయవంతమైంది. {time} కి {title} కొరకు అపాయింట్‌మెంట్ షెడ్యూల్ చేయబడింది.",
		executed_music: "చర్య విజయవంతమైంది. శాస్త్రీయ సంగీతం ప్రారంభించబడింది.",
		executed_stop_music: "చర్య విజయవంతమైంది. సంగీతం ఆపివేయబడింది.",
		executed_sos: "అత్యవసర SOS పంపబడింది. దయచేసి ప్రశాంతంగా ఉండండి.",
		weather: "వాతావరణం చాలా బాగుంది. ప్రస్తుతం డెబ్బై రెండు డిగ్రీలు మరియు ఎండగా ఉంది.",
		time: "ప్రస్తుత సమయం {time}.",
		joke: "శాస్త్రవేత్తలు అణువులను ఎందుకు నమ్మరు? ఎందుకంటే అవి ప్రతిదీ తయారు చేస్తాయి।",
		speak_fail: "మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో లోపం సంభవించింది. దయచేసి మళ్లీ చెప్పండి.",
		unclear: "నాకు స్పష్టంగా వినిపించలేదు. దయచేసి మళ్లీ చెప్పండి?",
		confirm_open: "నేను {site} ఓపెన్ చేయాలా?",
		executed_open: "చర్య విజయవంతమైంది. కొత్త ట్యాబ్‌లో {site} ఓపెన్ చేయబడుతోంది."
	},
	"ta-IN": {
		welcome: "வணக்கம், நான் நோவா எக்ஸ் ஏஐ, உங்கள் புத்திசாலித்தனமான தனிப்பட்ட உதவியாளர்.",
		confirm_reminder: "தொடர்வதற்கு முன் அனுமதி தேவை. {time} மணிக்கு {task} க்கான நினைவூட்டலை அமைக்கவா? நான் தொடரலாமா?",
		confirm_appointment: "தொடர்வதற்கு முன் அனுமதி தேவை. {time} மணிக்கு {title} க்கான சந்திப்பை திட்டமிடவா? உங்கள் உறுதிப்படுத்தலுக்காக காத்திருக்கிறேன்.",
		confirm_music: "தொடர்வதற்கு முன் அனுமதி தேவை. நான் அமைதியான கிளாசிக்கல் இசையை ஒலிக்கச் செய்யவா? நான் தொடரலாமா?",
		confirm_stop_music: "தொடர்வதற்கு முன் அனுமதி தேவை. நான் இசையை நிறுத்தவா? உங்கள் உறுதிப்படுத்தலுக்காக காத்திருக்கிறேன்.",
		confirm_sos: "தொடர்வதற்கு முன் அனுமதி தேவை. அவசர எஸ்ஓஎஸ் நெறிமுறையை செயல்படுத்தவா? உங்கள் உறுதிப்படுத்தலுக்காக காத்திருக்கிறேன்.",
		cancel: "நடவடிக்கை ரத்து செய்யப்பட்டது. உங்கள் அடுத்த கட்டளைக்காக காத்திருக்கிறேன்.",
		executed_reminder: "நடவடிக்கை நிறைவேற்றப்பட்டது. {time} மணிக்கு {task} நினைவூட்டல் அமைக்கப்பட்டது.",
		executed_appointment: "சந்திப்பு {time} மணிக்கு திட்டமிடப்பட்டது.",
		executed_music: "இசை ஒலிக்கத் தொடங்கியது.",
		executed_stop_music: "இசை நிறுத்தப்பட்டது.",
		executed_sos: "அவசர எஸ்ஓஎஸ் அனுப்பப்பட்டது. தயவுசெய்து அமைதியாக இருங்கள்.",
		weather: "வானிலை நன்றாக உள்ளது. தற்போது 72 டிகிரி மற்றும் வெயிலாக உள்ளது.",
		time: "தற்போதைய நேரம் {time}.",
		joke: "விஞ்ஞானிகள் ஏன் அணுக்களை நம்புவதில்லை? ஏனென்றால் அவை அனைத்தையும் உருவாக்குகின்றன।",
		speak_fail: "செயலாக்குவதில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் கூறவும்.",
		unclear: "எனக்கு தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் கூறுவீர்களா?",
		confirm_open: "நான் {site} திறக்க வேண்டுமா?",
		executed_open: "சந்திப்பு {site} புதிய தாவலில் திறக்கப்படுகிறது."
	},
	"kn-IN": {
		welcome: "ನಮಸ್ಕಾರ, ನಾನು ನೋವಾ ಎಕ್ಸ್ ಎಐ, ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ವೈಯಕ್ತಿಕ ಸಹಾಯಕ.",
		confirm_reminder: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಅನುಮತಿ ಬೇಕು. {time} ಕ್ಕೆ {task} ಗಾಗಿ ಜ್ಞಾಪನೆಯನ್ನು ಹೊಂದಿಸಬೇಕೆ? ನಾನು ಮುಂದುವರಿಯಲೇ?",
		confirm_appointment: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಅನುಮತಿ ಬೇಕು. {time} ಕ್ಕೆ {title} ಗಾಗಿ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ನಿಗದಿಪಡಿಸಬೇಕೆ? ನಿಮ್ಮ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದ್ದೇನೆ.",
		confirm_music: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಅನುಮತಿ ಬೇಕು. ನಾನು ಹಿತವಾದ ಶಾಸ್ತ್ರೀಯ ಸಂಗೀತವನ್ನು ಪ್ಲೇ ಮಾಡಬೇಕೆ? ನಾನು ಮುಂದುವರಿಯಲೇ?",
		confirm_stop_music: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಅನುಮತಿ ಬೇಕು. ನಾನು ಸಂಗೀತವನ್ನು ನಿಲ್ಲಿಸಬೇಕೆ? ನಿಮ್ಮ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದ್ದೇನೆ.",
		confirm_sos: "ಮುಂದುವರಿಯುವ ಮೊದಲು ಅನುಮತಿ ಬೇಕು. ನಾನು ತುರ್ತು SOS ಅನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಬೇಕೆ? ನಿಮ್ಮ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದ್ದೇನೆ.",
		cancel: "ಕಾರ್ಯವನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಮುಂದಿನ ಆದೇಶಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದ್ದೇನೆ.",
		executed_reminder: "ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ. {time} ಕ್ಕೆ {task} ಗಾಗಿ ಜ್ಞಾಪನೆ ಹೊಂದಿಸಲಾಗಿದೆ.",
		executed_appointment: "{time} ಕ್ಕೆ {title} ಗಾಗಿ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ.",
		executed_music: "ಶಾಸ್ತ್ರೀಯ ಸಂಗೀತ ಪ್ರಾರಂಭವಾಗಿದೆ.",
		executed_stop_music: "ಸಂಗೀತ ನಿಲ್ಲಿಸಲಾಗಿದೆ.",
		executed_sos: "ತುರ್ತು SOS ಕಳುಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಶಾಂತವಾಗಿರಿ.",
		weather: "ಹವಾಮಾನವು ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ. ಪ್ರಸ್ತುತ 72 ಡಿಗ್ರಿ ಮತ್ತು ಬಿಸಿಲಿದೆ.",
		time: "ಪ್ರಸ್ತುತ ಸಮಯ {time}.",
		joke: "ವಿಜ್ಞಾನಿಗಳು ಪರಮಾಣುಗಳನ್ನು ಏಕೆ ನಂಬುವುದಿಲ್ಲ? ಏಕೆಂದರೆ ಅವು ಎಲ್ಲವನ್ನೂ ಸೃಷ್ಟಿಸುತ್ತವೆ।",
		speak_fail: "ಸಂಸ್ಕರಿಸುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.",
		unclear: "ನನಗೆ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?",
		confirm_open: "ನಾನು {site} ತೆರೆಯಬೇಕೇ?",
		executed_open: "ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ. {site} ಅನ್ನು ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯಲಾಗುತ್ತಿದೆ."
	},
	"ml-IN": {
		welcome: "ഹലോ, ഞാൻ നോവ് എക്സ് എഐ, നിങ്ങളുടെ ബുദ്ധിമാനായ വ്യക്തിഗത സഹായി.",
		confirm_reminder: "തുടരുന്നതിന് മുൻപ് അനുമതി ആവശ്യമാണ്. {time}-ൽ {task} ഓർമ്മിപ്പിക്കണോ?",
		confirm_appointment: "തുടരുന്നതിന് മുൻപ് അനുമതി ആവശ്യമാണ്. {time}-ൽ {title} അപ്പോയിന്റ്മെന്റ് ഷെഡ്യൂൾ ചെയ്യണോ?",
		confirm_music: "തുടരുന്നതിന് മുൻപ് അനുമതി ആവശ്യമാണ്. ശാന്തമായ ക്ലാസിക്കൽ സംഗീതം പ്ലേ ചെയ്യണോ?",
		confirm_stop_music: "തുടരുന്നതിന് മുൻപ് അനുമതി ആവശ്യമാണ്. സംഗീതം നിർത്തണോ?",
		confirm_sos: "തുടരുന്നതിന് മുൻപ് അനുമതി ആവശ്യമാണ്. അടിയന്തിര SOS സജീവമാക്കണോ?",
		cancel: "നടപടി റദ്ദാക്കി. നിങ്ങളുടെ അടുത്ത നിർദ്ദേശങ്ങൾക്കായി കാത്തിരിക്കുന്നു.",
		executed_reminder: "നടപടി പൂർത്തിയായി. {time}-ൽ {task} മരുന്ന് ഓർമ്മപ്പെടുത്തൽ സജ്ജമാക്കി.",
		executed_appointment: "നടപടി പൂർത്തിയായി. {time}-ൽ {title} അപ്പോയിന്റ്മെന്റ് ഷെഡ്യൂൾ ചെയ്തു.",
		executed_music: "നടപടി പൂർത്തിയായി. ശാന്തമായ സംഗീതം പ്ലേ ചെയ്യുന്നു.",
		executed_stop_music: "നടപടി പൂർത്തിയായി. സംഗീതം നിർത്തിയിരിക്കുന്നു.",
		executed_sos: "അടിയന്തിര SOS സന്ദേശം അയച്ചിട്ടുണ്ട്. ദയവായി ശാന്തരായിരിക്കുക.",
		weather: "കാലാവസ്ഥ വളരെ മനോഹരമാണ്. ഇപ്പോൾ 72 ഡിഗ്രിയും വെയിലുമുണ്ട്.",
		time: "ഇപ്പോഴത്തെ സമയം {time} ആണ്.",
		joke: "എന്തുകൊണ്ടാണ് ശാസ്ത്രജ്ഞർ ആറ്റങ്ങളെ വിശ്വസിക്കാത്തത്? കാരണം അവർ എല്ലാ കാര്യങ്ങളും ഉണ്ടാക്കുന്നു!",
		speak_fail: "നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നതിൽ ഒരു പിശകുണ്ടായി.",
		unclear: "എനിക്ക് വ്യക്തമായി കേൾക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും പറയാമോ?",
		confirm_open: "ഞാൻ {site} തുറക്കണോ?",
		executed_open: "നടപടി പൂർത്തിയായി. {site} പുതിയ ടാബിൽ തുറക്കുന്നു."
	},
	"bn-IN": {
		welcome: "হ্যালো, আমি নোভা এক্স এআই, আপনার বুদ্ধিমান ব্যক্তিগত সহায়ক।",
		confirm_reminder: "অনুমতি প্রয়োজন। আমি কি {time}-এ {task} অনুস্মারক সেট করব?",
		confirm_appointment: "অনুমতি প্রয়োজন। আমি কি {time}-এ {title}-এর সাক্ষাৎকার নির্ধারণ করব?",
		confirm_music: "অনুমতি প্রয়োজন। আমি কি শান্ত সংগীত শুরু করব?",
		confirm_stop_music: "অনুমতি প্রয়োজন। আমি কি সংগীত বন্ধ করব?",
		confirm_sos: "অনুমতি প্রয়োজন। আমি কি জরুরি SOS সক্রিয় করব?",
		cancel: "পদক্ষেপ বাতিল করা হয়েছে। আপনার পরবর্তী আদেশের অপেক্ষায়।",
		executed_reminder: "পদক্ষেপ সম্পন্ন হয়েছে। {time}-এ {task}-এর অনুস্মারক সেট হয়েছে।",
		executed_appointment: "পদক্ষেপ সম্পন্ন হয়েছে। {time}-এ {title}-এর সাক্ষাৎকার নির্ধারণ হয়েছে।",
		executed_music: "শান্ত সংগীত সক্রিয় হয়েছে।",
		executed_stop_music: "সংগীত বন্ধ করা হয়েছে।",
		executed_sos: "জরুরি SOS পাঠানো হয়েছে। দয়া করে শান্ত থাকুন।",
		weather: "আবহাওয়া খুব সুন্দর। এখন ৭২ ডিগ্রি এবং রৌদ্রোজ্জ্বল।",
		time: "বর্তমান সময় {time}।",
		joke: "বিজ্ঞানীরা কেন পরমাণুকে বিশ্বাস করেন না? কারণ তারাই সব তৈরি করে।",
		speak_fail: "আপনার অনুরোধ প্রক্রিয়া করতে সমস্যা হয়েছে।",
		unclear: "আমি পরিষ্কারভাবে শুনতে পাইনি। দয়া করে আবার বলবেন কি?",
		confirm_open: "আমি কি {site} খুলব?",
		executed_open: "পদক্ষেপ সম্পন্ন হয়েছে। নতুন ট্যাবে {site} খোলা হচ্ছে।"
	},
	"mr-IN": {
		welcome: "नमस्कार, मी नोव्हा एक्स एआय, तुमचा बुद्धिमान वैयक्तिक सहाय्यक.",
		confirm_reminder: "परवानगी आवश्यक। मी {time} वाजता {task} साठी आठवण सेट करू का? मी पुढे जाऊ का?",
		confirm_appointment: "परवानगी आवश्यक। मी {time} वाजता {title} साठी तुमची भेट निश्चित करू का? तुमच्या मंजुरीची प्रतीक्षा आहे.",
		confirm_music: "परवानगी आवश्यक। मी शांत शास्त्रीय संगीत सुरू करू का? मी पुढे जाऊ का?",
		confirm_stop_music: "परवानगी आवश्यक। मी संगीत बंद करू का?",
		confirm_sos: "परवानगी आवश्यक। मी आपत्कालीन SOS सक्रिय करू का?",
		cancel: "कृती रद्द केली आहे। पुढील सूचनेची प्रतीक्षा आहे।",
		executed_reminder: "कृती पूर्ण झाली. {time} वाजता {task} आठवण सेट केली.",
		executed_appointment: "कृती पूर्ण झाली. {time} वाजता {title} भेट निश्चित केली.",
		executed_music: "संगीत सुरू झाले आहे।",
		executed_stop_music: "संगीत बंद केले आहे।",
		executed_sos: "आपत्कालीन SOS पाठविला आहे. शांत राहा.",
		weather: "हवामान चांगले आहे. सध्या ऊन आहे.",
		time: "वेळ {time} आहे.",
		joke: "वैज्ञानिक अणूंवर विश्वास का ठेवत नाहीत? कारण ते सर्वकाही बनवतात.",
		speak_fail: "तुमच्या विनंतीत अडचण आली आहे.",
		unclear: "मला स्पष्टपणे ऐकू आले नाही. कृपया पुन्हा सांगू शकाल का?",
		confirm_open: "मी {site} उघडू का?",
		executed_open: "कृती पूर्ण झाली. {site} नवीन टॅबमध्ये उघडत आहे."
	},
	"ur-PK": {
		welcome: "ہیلو، میں نووا ایکس ای آئی ہوں، آپ کا ذہین ذاتی معاون۔",
		confirm_reminder: "اجازت درکار ہے۔ کیا میں {time} پر {task} کی یاددہانی سیٹ کروں؟",
		confirm_appointment: "اجازت درکار ہے۔ کیا میں {time} پر {title} کی ملاقات کا وقت طے کروں؟",
		confirm_music: "اجازت درکار ہے۔ کیا میں پرسکون موسیقی چلاؤں؟",
		confirm_stop_music: "اجازت درکار ہے۔ کیا میں موسیقی بند کر دوں؟",
		confirm_sos: "اجازت درکار ہے۔ کیا میں ہنگامی SOS فعال کروں؟",
		cancel: "کارروائی منسوخ کر دی گئی۔ آپ کی اگلی ہدایات کا انتظار ہے۔",
		executed_reminder: "کارروائی مکمل ہو گئی۔ {time} پر {task} کی یاددہانی سیٹ ہو گئی۔",
		executed_appointment: "کارروائی مکمل ہو گئی۔ {time} پر {title} کی ملاقات طے ہو گئی۔",
		executed_music: "پرسکون موسیقی چل رہی ہے۔",
		executed_stop_music: "موسیقی بند کر دی گئی۔",
		executed_sos: "ہنگامی SOS بھیج دیا گیا ہے۔ برائے مہربانی پرسکون رہیں۔",
		weather: "موسم بہت خوشگوار ہے۔ ابھی درجہ حرارت 72 ڈگری اور دھوپ ہے۔",
		time: "اس وقت وقت {time} ہو رہا ہے۔",
		joke: "سائنسدان ایٹموں پر یقین کیوں نہیں کرتے؟ کیونکہ وہ ہر چیز خود بناتے ہیں۔",
		speak_fail: "آپ کی درخواست پر کارروائی میں خرابی ہوئی ہے۔",
		unclear: "میں واضح طور پر سن نہیں سکا۔ کیا آپ دوبارہ کہہ سکتے ہیں؟",
		confirm_open: "کیا آپ چاہتے ہیں کہ میں {site} کھولوں؟",
		executed_open: "کارروائی مکمل ہو گئی۔ نئے ٹیب میں {site} کھولا جا رہا ہے۔"
	}
};



// Check if a reminder command is incomplete
const isIncompleteReminder = (text: string): boolean => {
	const normalized = text.toLowerCase().trim();
	const genericReminders = [
		"set a reminder",
		"set reminder",
		"create a reminder",
		"create reminder",
		"medicine reminder",
		"appointment reminder",
		"alarm reminder",
		"remind me",
		"add reminder",
		"schedule reminder",
		"schedule a reminder",
		"set reminders",
		"create reminders"
	];
	if (genericReminders.includes(normalized)) {
		return true;
	}

	const timeKeywords = [
		"tomorrow", "today", "yesterday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
		"morning", "afternoon", "evening", "night", "pm", "am", "noon", "midnight", "at", "in", "after", "mins", "minute", "minutes", "hour", "hours",
		"कल", "परसों", "बजे", "को", "के लिए", "రేపు", "ఎల్లుండి", "ఈరోజు", "गంటలకు", "కి", "కొరకు", "நாளை", "நாளை மறுநாள்", "இன்று", "மணிக்கு", "க்கு", "நாளை", "ನಾಡಿದ್ದು", "இಂದು", "ಗಂಟೆಗೆ", "ಕ್ಕೆ", "నాളെ", "ഇന്ന്", "മണിക്ക്", "ആഗസ്റ്റ്", "തീയതി"
	];
	const hasTimeKeyword = timeKeywords.some(kw => normalized.includes(kw)) || /\b\d{1,2}(?::\d{2})?\b/.test(normalized);

	if (!hasTimeKeyword) {
		return true;
	}

	const cleanedSubject = normalized
		.replace(/^(?:remind me to|remind me|schedule appointment for|schedule|set a reminder to|set reminder to|create a reminder for|create reminder for|add reminder to|set a reminder for|set reminder for|create a reminder|create reminder|set a reminder|set reminder|medicine reminder|appointment reminder|alarm reminder)\s+/gi, "")
		.replace(/\b(?:tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|pm|am|at|on|for|in|noon|midnight)\b/gi, "")
		.replace(/\b(?:अगले|कल|परसों|बजे|को|के लिए|రేపు|ఎల్లుండి|ఈరోజు|గంటలకు|కి|కొరకు|நாளை|நாளை மறுநாள்|இன்று|மணிக்கு|க்கு|நாಳೆ|ನಾಡಿದ್ದು|இಂದು|ಗಂಟೆಗೆ|ಕ್ಕೆ|నాളെ|ഇന്ന്|മണിക്ക്|ആഗസ്റ്റ്|തീയതി)\b/gi, "")
		.replace(/\b\d{1,2}(?::\d{2})?\b/g, "")
		.replace(/\s+/g, " ")
		.trim();

	if (!cleanedSubject || ["reminder", "reminders", "appointment", "alarm", "medicine", "pill", "pills"].includes(cleanedSubject)) {
		return true;
	}

	return false;
};



const getTranslation = (key: string, params: Record<string, string> = {}, langCode = "en-US"): string => {
	const lang = DICTIONARY[langCode] || DICTIONARY["en-US"];
	let text = lang[key] || DICTIONARY["en-US"][key] || "";
	Object.entries(params).forEach(([param, value]) => {
		text = text.replace(new RegExp(`\\{${param}\\}`, "g"), value);
	});
	return text;
};

// Text Preprocessor for natural spoken names/dates
const cleanTextForSpeech = (text: string, langCode: string): string => {
	let clean = text;

	// 1. Date conversion: YYYY-MM-DD
	clean = clean.replace(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/g, (match, y, m, d) => {
		const months = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		const monthIndex = parseInt(m) - 1;
		const monthName = months[monthIndex] || "";
		const day = parseInt(d);
		let ordinalDay = String(day);
		if (day === 1 || day === 21 || day === 31) ordinalDay = day + "st";
		else if (day === 2 || day === 22) ordinalDay = day + "nd";
		else if (day === 3 || day === 23) ordinalDay = day + "rd";
		else ordinalDay = day + "th";
		
		if (langCode.startsWith("hi")) {
			const hiMonths = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
			return `${day} ${hiMonths[monthIndex] || ""} ${y}`;
		} else if (langCode.startsWith("te")) {
			const teMonths = ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబరు", "అక్టోబరు", "నవంబరు", "డిసెంబరు"];
			return `${day} ${teMonths[monthIndex] || ""} ${y}`;
		}
		return `${monthName} ${ordinalDay}, ${y}`;
	});

	// Date conversion: DD-MM-YYYY
	clean = clean.replace(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g, (match, d, m, y) => {
		const months = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		const monthIndex = parseInt(m) - 1;
		const monthName = months[monthIndex] || "";
		const day = parseInt(d);
		let ordinalDay = String(day);
		if (day === 1 || day === 21 || day === 31) ordinalDay = day + "st";
		else if (day === 2 || day === 22) ordinalDay = day + "nd";
		else if (day === 3 || day === 23) ordinalDay = day + "rd";
		else ordinalDay = day + "th";

		if (langCode.startsWith("hi")) {
			const hiMonths = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
			return `${day} ${hiMonths[monthIndex] || ""} ${y}`;
		} else if (langCode.startsWith("te")) {
			const teMonths = ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబరు", "అక్టోబరు", "నవంబరు", "డిసెంబరు"];
			return `${day} ${teMonths[monthIndex] || ""} ${y}`;
		}
		return `${monthName} ${ordinalDay}, ${y}`;
	});

	// 2. Time conversion: e.g. "8:00 AM" to "8 A.M."
	clean = clean.replace(/:00\s*(am|pm)/gi, " $1");
	
	// 3. Human-like pauses: add commas after names, dates, or key transitional words
	clean = clean.replace(/NovaX AI/g, "NovaX AI, ");

	// 4. Ensure clear pronunciation of acronyms
	clean = clean.replace(/\bSOS\b/g, "S.O.S.");
	
	return clean;
};

// Lock to "Google UK English Female" or closest Google English female voice (Requirements 1, 7, 8)
const findBestVoice = (
	langCode: string,
	systemVoices: SpeechSynthesisVoice[],
	genderPref: string = "auto"
): SpeechSynthesisVoice | null => {
	if (langCode || genderPref) { /* noop */ }
	if (!systemVoices || systemVoices.length === 0) return null;

	// 1. Exact match "Google UK English Female" (case-insensitive)
	let match = systemVoices.find(v => v.name.toLowerCase() === "google uk english female");
	if (match) return match;

	// 2. Contains "Google UK English Female"
	match = systemVoices.find(v => v.name.toLowerCase().includes("google uk english female"));
	if (match) return match;

	// 3. Contains "Google" and "UK English" and "Female" (or lang "en-gb")
	match = systemVoices.find(v => {
		const name = v.name.toLowerCase();
		const lang = v.lang.toLowerCase();
		return name.includes("google") && (lang === "en-gb" || lang.startsWith("en-gb") || name.includes("gb") || name.includes("uk")) && (name.includes("female") || name.includes("woman") || name.includes("girl"));
	});
	if (match) return match;

	// 4. Closest Google English female voice (e.g. Google US English Female, Google India English Female, etc.)
	match = systemVoices.find(v => {
		const name = v.name.toLowerCase();
		const lang = v.lang.toLowerCase();
		return name.includes("google") && lang.startsWith("en") && (name.includes("female") || name.includes("woman") || name.includes("girl"));
	});
	if (match) return match;

	// 5. Any Google English voice (female first, then any)
	match = systemVoices.find(v => {
		const name = v.name.toLowerCase();
		const lang = v.lang.toLowerCase();
		return name.includes("google") && lang.startsWith("en");
	});
	if (match) return match;

	// 6. Any other modern English female voice (Microsoft Jenny, Microsoft Aria, Samantha, etc.)
	const premiumFemaleEnglishKeywords = ["aria", "jenny", "samantha", "female", "woman", "girl"];
	match = systemVoices.find(v => {
		const name = v.name.toLowerCase();
		const lang = v.lang.toLowerCase();
		return lang.startsWith("en") && premiumFemaleEnglishKeywords.some(kw => name.includes(kw));
	});
	if (match) return match;

	// 7. Fallback to first English voice that is not the default robotic one
	match = systemVoices.find(v => v.lang.toLowerCase().startsWith("en") && !v.name.toLowerCase().includes("default"));
	if (match) return match;

	// 8. Fallback to any English voice
	match = systemVoices.find(v => v.lang.toLowerCase().startsWith("en"));
	if (match) return match;

	return systemVoices[0];
};

const isYouTubeCommand = (inputText: string): boolean => {
	const lower = inputText.toLowerCase();
	const clean = lower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();

	const ytKeywords = ["youtube", "yt", "యూట్యూబ్", "यूट्यूब", "யூடியூப்", "ಯೂಟ್ಯೂಬ್", "you tube"];
	const actionWords = ["open", "play", "kholo", "chalao", "chey", "teruvu", "pannunga", "cheyyi", "karo", "pannu", "madi", "cheyyu", "karen", "karyo", "thira", "tere", "thurakkuka", "khol", "ughad"];

	const hasKeyword = ytKeywords.some(keyword => clean.includes(keyword));
	const hasAction = actionWords.some(action => {
		const regex = new RegExp(`\\b${action}\\b|${action}`, "i");
		return regex.test(clean);
	});

	const explicitPhrases = [
		"open youtube", "play youtube", "open yt",
		"youtube open chey", "yt open chey", "youtube teruvu",
		"youtube kholo", "youtube chalao",
		"youtube open pannunga", "can u please open yt"
	].map(p => p.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim());

	if (explicitPhrases.some(phrase => clean.includes(phrase)) || (hasKeyword && hasAction)) {
		return true;
	}

	return false;
};

// Website Launch Extractor
const parseOpenCommand = (text: string): { site: string; isKnown: boolean; url: string } | null => {
	const normalized = text.toLowerCase().trim();

	// 1. Check known websites
	const knownPatterns: Record<string, { regex: RegExp; url: string }> = {
		YouTube: { regex: /(?:youtube|you tube|yutub|యూట్యూబ్|यूट्यूब|யூடியூப்|ಯೂಟ್ಯೂಬ್)/i, url: "https://youtube.com" },
		Google: { regex: /(?:google|gugle|గూగుల్|गूगल|கூகுள்|ಗೂಗಲ್)/i, url: "https://google.com" },
		Gmail: { regex: /(?:gmail|g mail|g-mail|ಜಿಮೇಲ್|जीमेल|ஜிமெயில்|జిమెయిల్)/i, url: "https://mail.google.com" },
		WhatsApp: { regex: /(?:whatsapp|whats app|వాట్సాప్|व्हाट्सएप|வாட்ஸ்அப்|ವಾట్సాಪ್)/i, url: "https://web.whatsapp.com" },
		Instagram: { regex: /(?:instagram|insta|ఇన్‌స్టా|इंस्टा|இன்ஸ்டா|ಇನ್ಸ್ಟಾ)/i, url: "https://instagram.com" },
		Spotify: { regex: /(?:spotify|స్పాటిఫై|स्पॉटिफ़ाई|ஸ்பாட்டிஃபை|ಸ್ಪಾಟಿಫೈ)/i, url: "https://open.spotify.com" },
		ChatGPT: { regex: /(?:chatgpt|chat gpt|చాట్‌జిపిటి|चैटजीपीटी|சாட்ஜிபிடி|ಚಾಟ್ಜಿಪಿಟಿ)/i, url: "https://chatgpt.com" }
	};

	for (const [site, config] of Object.entries(knownPatterns)) {
		if (config.regex.test(normalized)) {
			return { site, isKnown: true, url: config.url };
		}
	}

	// 2. Check prefix/suffix commands for unknown sites
	const prefixes = /^(?:open|launch|go to|visit|can you open|please open|i want to open|launch website)\s+(.+)$/i;
	const matchPrefix = normalized.match(prefixes);
	if (matchPrefix) {
		const cleaned = matchPrefix[1].replace(/[?.!]/g, "").trim();
		if (cleaned) {
			const displaySite = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
			return { site: displaySite, isKnown: false, url: displaySite };
		}
	}

	const suffixes = /^(.+?)\s*(?:open\s*(?:cheyyi|karo|pannu|madi|cheyyu|karen|karyo)|ni\s+open\s+cheyyi|ko\s+open\s+karo|kholo|thira|tere|thurakkuka|khol|ughad|kholo|khoolo)[?.!]*$/i;
	const matchSuffix = normalized.match(suffixes);
	if (matchSuffix) {
		const cleaned = matchSuffix[1].replace(/^(?:please|can you|i want to|website)\s+/i, "").trim();
		if (cleaned) {
			const displaySite = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
			return { site: displaySite, isKnown: false, url: displaySite };
		}
	}

	// 3. Fallback: Short command containing a common brand name or unknown site
	const commonSites = ["yahoo", "github", "facebook", "wikipedia", "amazon", "netflix", "twitter", "x", "outlook", "zoom", "teams", "reddit", "bing", "apple", "microsoft", "linkedin"];
	const words = normalized.split(/\s+/);
	if (words.length <= 3) {
		for (const word of words) {
			const cleanWord = word.replace(/[?.!]/g, "").trim();
			if (commonSites.includes(cleanWord) || cleanWord.includes(".") || (/^[a-z0-9]+$/i.test(cleanWord) && cleanWord.length > 2)) {
				const stopWords = ["yes", "no", "cancel", "proceed", "confirm", "stop", "music", "play", "time", "date", "weather", "joke", "help", "today", "tomorrow"];
				if (!stopWords.includes(cleanWord)) {
					const displaySite = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
					return { site: displaySite, isKnown: false, url: displaySite };
				}
			}
		}
	}

	return null;
};

// Cut off relative date keywords from voice title extraction
const extractReminderTitle = (text: string): string => {
	const cleaned = text.toLowerCase()
		.replace(/^(?:remind me to|remind me|schedule appointment for|schedule|set a reminder to|set reminder to|create a reminder for|create reminder for|add reminder to)\s+/i, "")
		.replace(/\b(?:tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|night|pm|am|at|on|for|in)\b/gi, "")
		// Indian lang relative time keywords
		.replace(/\b(?:अगले|कल|परसों|बजे|को|के लिए|రేపు|ఎల్లుండి|ఈరోజు|గంటలకు|కి|కొరకు|நாளை|நாளை மறுநாள்|இன்று|மணிக்கு|க்கு|ನಾಳೆ|ನಾಡಿದ್ದು|ಇಂದು|ಗಂಟೆಗೆ|ಕ್ಕೆ|నాളെ|ഇന്ന്|മണിക്ക്|ആഗസ്റ്റ്|തീയതി)\b/gi, "")
		.replace(/\b\d{1,2}(?::\d{2})?\b/g, "")
		.replace(/\s+/g, " ")
		.trim();
	
	if (cleaned.length === 0) return "Medication Reminder";
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

// Voice Settings Drawer Component
const SettingsPanel = ({
	isOpen,
	onClose,
	voices,
	selectedVoiceName,
	setSelectedVoiceName,
	voiceRate,
	setVoiceRate,
	voicePitch,
	setVoicePitch,
	voiceVolume,
	setVoiceVolume,
	activeLang,
	setActiveLang,
	autoDetectLang,
	setAutoDetectLang,
	voiceGenderPref,
	setVoiceGenderPref,
	onPreviewVoice,
	selectedLocation,
	setSelectedLocation,
	caregiverName,
	setCaregiverName,
	caregiverPhone,
	setCaregiverPhone,
	caregiverCountry,
	setCaregiverCountry,
	caregiverPhoneCode,
	setCaregiverPhoneCode,
}: {
	isOpen: boolean;
	onClose: () => void;
	voices: SpeechSynthesisVoice[];
	selectedVoiceName: string;
	setSelectedVoiceName: (name: string) => void;
	voiceRate: number;
	setVoiceRate: (rate: number) => void;
	voicePitch: number;
	setVoicePitch: (pitch: number) => void;
	voiceVolume: number;
	setVoiceVolume: (volume: number) => void;
	activeLang: string;
	setActiveLang: (lang: string) => void;
	autoDetectLang: boolean;
	setAutoDetectLang: (auto: boolean) => void;
	voiceGenderPref: "female" | "male" | "auto";
	setVoiceGenderPref: (pref: "female" | "male" | "auto") => void;
	onPreviewVoice: () => void;
	selectedLocation: LocationItem | null;
	setSelectedLocation: (loc: LocationItem | null) => void;
	caregiverName: string;
	setCaregiverName: (name: string) => void;
	caregiverPhone: string;
	setCaregiverPhone: (phone: string) => void;
	caregiverCountry: string;
	setCaregiverCountry: (country: string) => void;
	caregiverPhoneCode: string;
	setCaregiverPhoneCode: (code: string) => void;
}) => {
	const [countrySearch, setCountrySearch] = useState("");
	const [selectedCountryCode, setSelectedCountryCode] = useState("");
	const [selectedStateCode, setSelectedStateCode] = useState("");
	const [locCountrySearch, setLocCountrySearch] = useState("");
	const [locStateSearch, setLocStateSearch] = useState("");
	const [locCitySearch, setLocCitySearch] = useState("");

	useEffect(() => {
		if (selectedLocation && selectedLocation.id) {
			const parts = selectedLocation.id.split("_");
			if (parts.length >= 3) {
				setSelectedCountryCode(parts[0]);
				setSelectedStateCode(parts[1]);
			}
		} else {
			setSelectedCountryCode("");
			setSelectedStateCode("");
		}
	}, [selectedLocation, isOpen]);

	const filteredCountries = sortedCountries.filter(c =>
		c.name.common.toLowerCase().includes(countrySearch.toLowerCase())
	);

	return (
		<AnimatePresence>
		{isOpen && (
			<>
				{/* Dark Overlay overlay */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.4 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
					className="fixed inset-0 bg-black/10 z-40 backdrop-blur-sm"
				/>
				{/* Drawer container (Redesigned with Premium White Theme) */}
				<motion.div
					initial={{ x: "100%" }}
					animate={{ x: 0 }}
					exit={{ x: "100%" }}
					transition={{ type: "spring", damping: 25, stiffness: 200 }}
					className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#FFFFFF] border-l border-[#E5E7EB] text-[#4B5563] z-50 p-6 overflow-y-auto shadow-soft flex flex-col justify-between"
				>
					<div>
						{/* Header */}
						<div className="flex justify-between items-center mb-6 pb-4 border-b border-[#E5E7EB]">
							<h2 className="text-xl font-bold flex items-center gap-2 text-[#111827]">
								<FaCog className="animate-spin-slow text-[#2563EB]" /> NovaX AI Settings
							</h2>
							<button
								onClick={onClose}
								className="p-2 hover:bg-[#F3F4F6] rounded-full transition-colors text-[#4B5563] hover:text-[#111827]"
							>
								<FaTimes />
							</button>
						</div>

						{/* Setting Controls */}
						<div className="space-y-6">
							{/* Language block */}
							<div className="space-y-4 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
								<h3 className="text-sm font-semibold text-[#4B5563] flex items-center gap-2">
									<FaGlobe className="text-[#2563EB]" /> Multilingual Settings
								</h3>
								<div className="flex items-center justify-between py-1">
									<span className="text-sm text-[#4B5563]">Auto Detect Language</span>
									<input
										type="checkbox"
										checked={autoDetectLang}
										onChange={(e) => setAutoDetectLang(e.target.checked)}
										className="w-5 h-5 accent-[#2563EB] cursor-pointer rounded"
									/>
								</div>
								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Preferred Language</span>
									<select
										value={activeLang}
										onChange={(e) => setActiveLang(e.target.value)}
										disabled={autoDetectLang}
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-50"
									>
										<option value="en-US">English</option>
										<option value="hi-IN">Hindi (हिन्दी)</option>
										<option value="te-IN">Telugu (తెలుగు)</option>
										<option value="ta-IN">Tamil (தமிழ்)</option>
										<option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
										<option value="ml-IN">Malayalam (മലയാളം)</option>
										<option value="bn-IN">Bengali (বাংলা)</option>
										<option value="mr-IN">Marathi (मराठी)</option>
										<option value="ur-PK">Urdu (اردو)</option>
									</select>
								</div>
							</div>

							{/* Location Selector Block */}
							<div className="space-y-4 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
								<h3 className="text-sm font-semibold text-[#4B5563] flex items-center gap-2">
									<FaGlobe className="text-[#2563EB]" /> Location Settings
								</h3>

								{/* Country Select */}
								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Search Country</span>
									<input
										type="text"
										value={locCountrySearch}
										onChange={(e) => setLocCountrySearch(e.target.value)}
										placeholder="Type country name..."
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									/>
								</div>

								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Country</span>
									<select
										value={selectedCountryCode}
										onChange={(e) => {
											const code = e.target.value;
											setSelectedCountryCode(code);
											setSelectedStateCode("");
											setLocStateSearch("");
											setLocCitySearch("");
											if (code === "") {
												setSelectedLocation(null);
											}
										}}
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									>
										<option value="">Select country...</option>
										{(Country.getAllCountries() || [])
											.filter(c => c.name.toLowerCase().includes(locCountrySearch.toLowerCase()))
											.map(c => (
												<option key={c.isoCode} value={c.isoCode}>
													{c.flag || ""} {c.name}
												</option>
											))
										}
									</select>
								</div>

								{/* State Select */}
								{selectedCountryCode && (State.getStatesOfCountry(selectedCountryCode) || []).length > 0 && (
									<>
										<div className="space-y-1">
											<span className="text-xs text-[#6B7280] block">Search State</span>
											<input
												type="text"
												value={locStateSearch}
												onChange={(e) => setLocStateSearch(e.target.value)}
												placeholder="Type state name..."
												className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
											/>
										</div>

										<div className="space-y-1">
											<span className="text-xs text-[#6B7280] block">State</span>
											<select
												value={selectedStateCode}
												onChange={(e) => {
													const code = e.target.value;
													setSelectedStateCode(code);
													setLocCitySearch("");
												}}
												className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
											>
												<option value="">Select state...</option>
												{(State.getStatesOfCountry(selectedCountryCode) || [])
													.filter(s => s.name.toLowerCase().includes(locStateSearch.toLowerCase()))
													.map(s => (
														<option key={s.isoCode} value={s.isoCode}>
															{s.name}
														</option>
													))
												}
											</select>
										</div>
									</>
								)}

								{/* City Select */}
								{selectedCountryCode && (
									<>
										{((State.getStatesOfCountry(selectedCountryCode) || []).length === 0 || selectedStateCode) && (
											<>
												<div className="space-y-1">
													<span className="text-xs text-[#6B7280] block">Search City</span>
													<input
														type="text"
														value={locCitySearch}
														onChange={(e) => setLocCitySearch(e.target.value)}
														placeholder="Type city name..."
														className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
													/>
												</div>

												<div className="space-y-1">
													<span className="text-xs text-[#6B7280] block">City</span>
													<select
														value={selectedLocation ? selectedLocation.city : ""}
														onChange={(e) => {
															const cityName = e.target.value;
															if (cityName === "") {
																setSelectedLocation(null);
																return;
															}

															const countryObj = Country.getCountryByCode(selectedCountryCode);
															const stateObj = selectedStateCode ? State.getStateByCodeAndCountry(selectedStateCode, selectedCountryCode) : null;
															
															// Derive timezone using country timezones and heuristic
															let tz = "UTC";
															if (countryObj && countryObj.timezones && countryObj.timezones.length > 0) {
																const normalizedCity = cityName.toLowerCase().replace(/\s+/g, "_");
																const foundTz = countryObj.timezones.find(t => 
																	t.zoneName.toLowerCase().replace(/\s+/g, "_").endsWith(normalizedCity) ||
																	t.zoneName.toLowerCase().replace(/\s+/g, "_").includes(normalizedCity)
																);
																if (foundTz) {
																	tz = foundTz.zoneName;
																} else if (stateObj) {
																	const normalizedState = stateObj.name.toLowerCase().replace(/\s+/g, "_");
																	const stateTz = countryObj.timezones.find(t =>
																		t.zoneName.toLowerCase().replace(/\s+/g, "_").includes(normalizedState)
																	);
																	tz = stateTz ? stateTz.zoneName : countryObj.timezones[0].zoneName;
																} else {
																	tz = countryObj.timezones[0].zoneName;
																}
															}

															const stateSuffix = stateObj ? `, ${stateObj.name}` : "";
															const locationItem: LocationItem = {
																id: `${selectedCountryCode}_${selectedStateCode}_${cityName}`,
																name: `${cityName}${stateSuffix}, ${countryObj?.name || selectedCountryCode}`,
																city: cityName,
																country: countryObj?.name || selectedCountryCode,
																timezone: tz
															};
															setSelectedLocation(locationItem);
														}}
														className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
													>
														<option value="">Select city...</option>
														{((selectedStateCode 
															? City.getCitiesOfState(selectedCountryCode, selectedStateCode)
															: City.getCitiesOfCountry(selectedCountryCode)
														) || [])
															.filter(c => c.name.toLowerCase().includes(locCitySearch.toLowerCase()))
															.map((c, idx) => (
																<option key={`${c.name}-${idx}`} value={c.name}>
																	{c.name}
																</option>
															))
														}
													</select>
												</div>
											</>
										)}
									</>
								)}
							</div>

							{/* Emergency SOS Setup Section */}
							<div className="space-y-4 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
								<h3 className="text-sm font-semibold text-[#4B5563] flex items-center gap-2">
									<FaExclamationTriangle className="text-red-500" /> Emergency Settings
								</h3>
								
								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Caregiver Name</span>
									<input
										type="text"
										value={caregiverName}
										onChange={(e) => setCaregiverName(e.target.value)}
										placeholder="e.g. John Doe"
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									/>
								</div>

								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Search Caregiver Country</span>
									<input
										type="text"
										value={countrySearch}
										onChange={(e) => setCountrySearch(e.target.value)}
										placeholder="Type country name..."
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									/>
								</div>

								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Caregiver Country</span>
									<select
										value={caregiverCountry}
										onChange={(e) => {
											const val = e.target.value;
											setCaregiverCountry(val);
											const found = sortedCountries.find(c => c.cca2 === val);
											if (found) {
												const dialCode = found.idd.root + (found.idd.suffixes && found.idd.suffixes.length === 1 ? found.idd.suffixes[0] : "");
												setCaregiverPhoneCode(dialCode);
											}
										}}
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									>
										<option value="">Select country...</option>
										{filteredCountries.map(c => (
											<option key={c.cca2} value={c.cca2}>
												{c.flag} {c.name.common}
											</option>
										))}
									</select>
								</div>

								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Country Dial Code</span>
									<select
										value={caregiverPhoneCode}
										onChange={(e) => setCaregiverPhoneCode(e.target.value)}
										className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
									>
										<option value="">Select dial code...</option>
										{phoneCodes.map(pc => (
											<option key={pc.cca2} value={pc.dialCode}>
												{pc.flag} {pc.dialCode} ({pc.name})
											</option>
										))}
									</select>
								</div>

								<div className="space-y-1">
									<span className="text-xs text-[#6B7280] block">Caregiver Phone Number</span>
									<div className="flex gap-2">
										{caregiverPhoneCode && (
											<span className="flex items-center justify-center bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-3 text-[#4B5563] text-sm font-semibold">
												{caregiverPhoneCode}
											</span>
										)}
										<input
											type="tel"
											value={caregiverPhone}
											onChange={(e) => setCaregiverPhone(e.target.value)}
											placeholder="e.g. 5550199"
											className="flex-1 w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
										/>
									</div>
								</div>
							</div>

							{/* Voice Gender Style Selector (Requirement 5) */}
							<div className="space-y-2 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm opacity-50">
								<label className="text-sm font-semibold text-[#4B5563] block">
									Voice Style Priority
								</label>
								<div className="grid grid-cols-3 gap-2 bg-[#F8FBFF] p-1.5 rounded-xl border border-[#E5E7EB] cursor-not-allowed">
									<button
										disabled={true}
										onClick={() => setVoiceGenderPref("auto")}
										className={`py-1.5 px-2 text-xs font-semibold rounded-lg cursor-not-allowed ${
											voiceGenderPref === "auto"
												? "bg-[#2563EB]/20 text-[#2563EB]"
												: "text-[#9CA3AF]"
										}`}
									>
										Auto
									</button>
									<button
										disabled={true}
										onClick={() => setVoiceGenderPref("female")}
										className={`py-1.5 px-2 text-xs font-semibold rounded-lg cursor-not-allowed ${
											voiceGenderPref === "female"
												? "bg-[#2563EB]/20 text-[#2563EB]"
												: "text-[#9CA3AF]"
										}`}
									>
										Female
									</button>
									<button
										disabled={true}
										onClick={() => setVoiceGenderPref("male")}
										className={`py-1.5 px-2 text-xs font-semibold rounded-lg cursor-not-allowed ${
											voiceGenderPref === "male"
												? "bg-[#2563EB]/20 text-[#2563EB]"
												: "text-[#9CA3AF]"
										}`}
									>
										Male
									</button>
								</div>
							</div>

							{/* Voice selector block & Preview Voice (Requirement 10) */}
							<div className="space-y-3 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
								<label className="text-sm font-semibold text-[#4B5563] block">
									Voice Synthesis Engine
								</label>
								<select
									value={selectedVoiceName}
									onChange={(e) => setSelectedVoiceName(e.target.value)}
									disabled={true}
									className="w-full bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#6B7280] text-sm cursor-not-allowed focus:outline-none"
								>
									{voices.map((v) => (
										<option key={v.name} value={v.name}>
											{v.name} ({v.lang})
										</option>
									))}
									{voices.length === 0 && (
										<option value="">No browser voices loaded</option>
									)}
								</select>
								<div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
									Locked to Google UK English Female (en-GB)
								</div>

								<button
									onClick={onPreviewVoice}
									className="w-full py-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#DBEAFE] shadow-sm active:scale-95 duration-100"
								>
									<FaVolumeUp className="w-3.5 h-3.5" /> Preview Voice
								</button>
							</div>

							{/* Properties Sliders */}
							<div className="space-y-4 bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
								<h3 className="text-sm font-semibold text-[#4B5563] flex justify-between items-center">
									Speech Modulations
									<span className="text-[10px] text-[#9CA3AF] font-normal italic">Enforced Default</span>
								</h3>
								
								<div className="space-y-2">
									<div className="flex justify-between text-xs text-[#9CA3AF]">
										<span>Volume</span>
										<span className="font-semibold">{Math.round(voiceVolume * 100)}%</span>
									</div>
									<input
										type="range"
										min="0"
										max="1"
										step="0.05"
										value={voiceVolume}
										onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
										disabled={true}
										className="w-full h-1.5 bg-[#F3F4F6] rounded-lg appearance-none cursor-not-allowed accent-[#9CA3AF]"
									/>
								</div>

								<div className="space-y-2">
									<div className="flex justify-between text-xs text-[#9CA3AF]">
										<span>Speed (Rate)</span>
										<span className="font-semibold">{voiceRate.toFixed(2)}x</span>
									</div>
									<input
										type="range"
										min="0.5"
										max="2"
										step="0.05"
										value={voiceRate}
										onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
										disabled={true}
										className="w-full h-1.5 bg-[#F3F4F6] rounded-lg appearance-none cursor-not-allowed accent-[#9CA3AF]"
									/>
								</div>

								<div className="space-y-2">
									<div className="flex justify-between text-xs text-[#9CA3AF]">
										<span>Pitch</span>
										<span className="font-semibold">{voicePitch.toFixed(2)}</span>
									</div>
									<input
										type="range"
										min="0.5"
										max="2"
										step="0.05"
										value={voicePitch}
										onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
										disabled={true}
										className="w-full h-1.5 bg-[#F3F4F6] rounded-lg appearance-none cursor-not-allowed accent-[#9CA3AF]"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Footer info */}
					<div className="text-center text-xs text-[#6B7280] border-t border-[#E5E7EB] pt-4 mt-6">
						NovaX AI Premium Elderly Companion Dashboard
					</div>
				</motion.div>
			</>
		)}
	</AnimatePresence>
	);
};

export default function LandingPage() {
	// Notifications
	// const { notifications, unreadCount } = useNotifications(1);
	const notifications: any[] = [];
	const unreadCount = 0;

	useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			console.log("Active notifications:", notifications);
		}
	}, [notifications]);

	// Conversation messages
	const [messages, setMessages] = useState<Message[]>([]);
	const [chatInput, setChatInput] = useState("");
	const [isThinking, setIsThinking] = useState(false);
	
	// Voice settings states
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
	const [selectedVoiceName, setSelectedVoiceName] = useState("");
	const [voiceRate, setVoiceRate] = useState(1.0); // Default Rate: 1.0 (Requirement 4)
	const [voicePitch, setVoicePitch] = useState(1.1); // Default Pitch: 1.1 (Requirement 4)
	const [voiceVolume, setVoiceVolume] = useState(1.0); // Default Volume: 1.0 (Requirement 4)
	const [voiceGenderPref, setVoiceGenderPref] = useState<"female" | "male" | "auto">("auto"); // (Requirement 5)
	
	// Language selection states
	const [activeLang, setActiveLang] = useState("en-US");
	const [autoDetectLang, setAutoDetectLang] = useState(true);
	const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);

	// Caregiver Emergency Contact states
	const [caregiverName, setCaregiverName] = useState("");
	const [caregiverPhone, setCaregiverPhone] = useState("");
	const [caregiverCountry, setCaregiverCountry] = useState("");
	const [caregiverPhoneCode, setCaregiverPhoneCode] = useState("");

	// Reminders state
	const [reminders, setReminders] = useState<TaskItem[]>([]);
	const [waitingForWeatherCity, setWaitingForWeatherCity] = useState(false);
	const [isLoadingReminders, setIsLoadingReminders] = useState(false);

	// Custom Manual Reminder Form state
	const [manualReminderTitle, setManualReminderTitle] = useState("");
	const [manualReminderDate, setManualReminderDate] = useState("");
	const [manualReminderTime, setManualReminderTime] = useState("");

	// Action confirmation state (sosPending removed)

	// Voice recognition state
	const [isListening, setIsListening] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const recognitionRef = useRef<any>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

	// Load settings and data
	useEffect(() => {
		// Load from localStorage
		if (typeof window !== "undefined") {
			const savedLang = localStorage.getItem("novax_lang");
			if (savedLang) setActiveLang(savedLang);
			
			const savedAuto = localStorage.getItem("novax_auto_detect");
			if (savedAuto !== null) setAutoDetectLang(savedAuto === "true");

			// Load modulation settings from local storage or set defaults
			const savedRate = localStorage.getItem("novax_rate");
			if (savedRate) setVoiceRate(parseFloat(savedRate));
			else setVoiceRate(1.0);

			const savedPitch = localStorage.getItem("novax_pitch");
			if (savedPitch) setVoicePitch(parseFloat(savedPitch));
			else setVoicePitch(1.1);

			const savedVolume = localStorage.getItem("novax_volume");
			if (savedVolume) setVoiceVolume(parseFloat(savedVolume));
			else setVoiceVolume(1.0);

			const savedGenderPref = localStorage.getItem("novax_voice_gender_pref") as "female" | "male" | "auto";
			if (savedGenderPref) setVoiceGenderPref(savedGenderPref);
			else setVoiceGenderPref("auto");

			const savedLoc = localStorage.getItem("novax_selected_location");
			if (savedLoc) {
				try {
					setSelectedLocation(JSON.parse(savedLoc));
				} catch (e) {
					console.error("Error parsing saved location", e);
				}
			}

			const savedCgName = localStorage.getItem("novax_caregiver_name");
			if (savedCgName) setCaregiverName(savedCgName);

			const savedCgPhone = localStorage.getItem("novax_caregiver_phone");
			if (savedCgPhone) setCaregiverPhone(savedCgPhone);

			const savedCgCountry = localStorage.getItem("novax_caregiver_country");
			if (savedCgCountry) setCaregiverCountry(savedCgCountry);

			const savedCgPhoneCode = localStorage.getItem("novax_caregiver_phone_code");
			if (savedCgPhoneCode) setCaregiverPhoneCode(savedCgPhoneCode);
		}

		// Initial load of reminders
		loadReminders();

		// Browser voice synthesis loader
		if (typeof window !== "undefined" && window.speechSynthesis) {
			const loadBrowserVoices = () => {
				const availableVoices = window.speechSynthesis.getVoices();
				setVoices(availableVoices);
				console.log("Loaded voices:", availableVoices); // Requirement 7

				if (availableVoices.length > 0) {
					// On startup, automatically find and select locked voice, then save to localStorage
					const best = findBestVoice(activeLang, availableVoices);
					if (best) {
						setSelectedVoiceName(best.name);
						localStorage.setItem("novax_voice_name", best.name);
					}
				}
			};

			loadBrowserVoices();
			window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
			
			// Initial welcome speech
			const welcomeText = getTranslation("welcome", {}, activeLang);
			setMessages([
				{
					sender: "novax",
					text: welcomeText,
					timestamp: new Date()
				}
			]);
			// delay speech slightly on mount for user interaction gesture rules
			setTimeout(() => {
				speak(welcomeText, activeLang);
			}, 1000);

			return () => {
				window.speechSynthesis.onvoiceschanged = null;
			};
		}
	}, []);

	// Save settings changes
	useEffect(() => {
		if (typeof window !== "undefined" && activeLang) {
			localStorage.setItem("novax_lang", activeLang);
		}
	}, [activeLang]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("novax_auto_detect", String(autoDetectLang));
		}
	}, [autoDetectLang]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("novax_rate", String(voiceRate));
			localStorage.setItem("novax_pitch", String(voicePitch));
			localStorage.setItem("novax_volume", String(voiceVolume));
			localStorage.setItem("novax_voice_name", selectedVoiceName);
			localStorage.setItem("novax_voice_gender_pref", voiceGenderPref);
		}
	}, [voiceRate, voicePitch, voiceVolume, selectedVoiceName, voiceGenderPref]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			if (selectedLocation) {
				localStorage.setItem("novax_selected_location", JSON.stringify(selectedLocation));
			} else {
				localStorage.removeItem("novax_selected_location");
			}
		}
	}, [selectedLocation]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("novax_caregiver_name", caregiverName);
			localStorage.setItem("novax_caregiver_phone", caregiverPhone);
			localStorage.setItem("novax_caregiver_country", caregiverCountry);
			localStorage.setItem("novax_caregiver_phone_code", caregiverPhoneCode);
		}
	}, [caregiverName, caregiverPhone, caregiverCountry, caregiverPhoneCode]);

	// Auto-scroll chat log
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Load reminders from DB & localStorage
	const loadReminders = async () => {
		setIsLoadingReminders(true);
		
		// Remove or comment out any fetch call to /api/notifications/user/1
		// await fetch("/api/notifications/user/1");

		let localTasks: TaskItem[] = [];
		try {
			const saved = localStorage.getItem("novax_reminders");
			if (saved) {
				localTasks = JSON.parse(saved).map((t: any) => ({
					id: t.id,
					task_id: t.task_id || t.id,
					title: t.title,
					type: t.type,
					event_time: new Date(t.event_time)
				}));
			}
		} catch (e) {
			console.error("Error parsing local reminders:", e);
		}

		localTasks.sort((a, b) => a.event_time.getTime() - b.event_time.getTime());

		setReminders(localTasks);
		setIsLoadingReminders(false);
	};

	// Local script language detector (supports 9 languages + mixed English/Indian keywords)
	const detectLanguage = (text: string): string => {
		if (!autoDetectLang) return activeLang;

		if (/[\u0c00-\u0c7f]/.test(text)) return "te-IN"; // Telugu
		if (/[\u0b80-\u0bff]/.test(text)) return "ta-IN"; // Tamil
		if (/[\u0c80-\u0cff]/.test(text)) return "kn-IN"; // Kannada
		if (/[\u0d00-\u0d7f]/.test(text)) return "ml-IN"; // Malayalam
		if (/[\u0980-\u09ff]/.test(text)) return "bn-IN"; // Bengali
		if (/[\u0600-\u06ff]/.test(text)) return "ur-PK"; // Urdu
		
		// Marathi vs Hindi (both use Devanagari range \u0900-\u097f)
		if (/[\u0900-\u097f]/.test(text)) {
			// Check for Marathi-specific characters (like \u0933 / ळ) or common Marathi words
			if (/[\u0933]|(?:आहे|नाही|काय|करतो|मला|तुम्ही|आपण)/.test(text)) {
				return "mr-IN";
			}
			return "hi-IN"; // Default Devanagari to Hindi
		}

		// Mixed language matching (e.g. English keywords in a non-English session)
		const hasIndianScript = /[\u0900-\u0d7f]/.test(text);
		if (!hasIndianScript) {
			const englishPatterns = /^(?:hello|hi|hey|weather|time|joke|help|emergency|how are you|good morning|good afternoon|good evening|bye|goodbye|open|launch)/i;
			if (englishPatterns.test(text) || activeLang === "en-US") {
				return "en-US";
			}
			return activeLang; // Continue in active lang for mixed text (e.g. "tablet" in a Hindi phrase)
		}

		return "en-US";
	};

	// Clean messages helper
	const addNovaXMessage = (text: string, isConfirmation = false) => {
		setMessages((prev) => [
			...prev,
			{ sender: "novax", text, timestamp: new Date(), isConfirmation }
		]);
	};

	const addUserMessage = (text: string) => {
		setMessages((prev) => [
			...prev,
			{ sender: "user", text, timestamp: new Date() }
		]);
	};

	// Speech synthesis execution
	const speak = (text: string, langCode: string) => {
		if (typeof window === "undefined" || !window.speechSynthesis) return;

		// Cancel any running speech before starting new speech
		window.speechSynthesis.cancel();
		setIsSpeaking(true);

		const targetLang = langCode || activeLang;
		const cleanedText = cleanTextForSpeech(text, targetLang);
		const utterance = new SpeechSynthesisUtterance(cleanedText);
		utteranceRef.current = utterance; // Retain reference to prevent GC cutting speech off

		// Apply modulations from active voice settings
		utterance.rate = voiceRate;
		utterance.pitch = voicePitch;
		utterance.volume = voiceVolume;

		// Always lock voice to selected/best voice (Requirements 1, 3, 4, 7, 8)
		const targetVoice = voices.find(v => v.name === selectedVoiceName) || findBestVoice(targetLang, voices, voiceGenderPref);
		if (targetVoice) {
			utterance.voice = targetVoice;
			utterance.lang = targetVoice.lang;
		} else {
			utterance.lang = targetLang;
		}

		utterance.onend = () => {
			setIsSpeaking(false);
		};

		utterance.onerror = (e) => {
			console.warn("Speech Synthesis Error (Silenced):", e);
			setIsSpeaking(false);
		};

		window.speechSynthesis.speak(utterance);
	};

	const handlePreviewVoice = () => {
		const previewText = activeLang === "en-US" 
			? "Hello! I am NovaX AI, your intelligent companion. How does my voice sound?" 
			: getTranslation("welcome", {}, activeLang);
		speak(previewText, activeLang);
	};

	const checkReminders = () => {
		const now = new Date();
		setReminders(prev => {
			const active: TaskItem[] = [];
			const triggered: TaskItem[] = [];

			for (const r of prev) {
				const remTime = new Date(r.event_time);
				if (now >= remTime) {
					triggered.push(r);
				} else {
					active.push(r);
				}
			}

			if (triggered.length > 0) {
				triggered.forEach(r => {
					if (typeof window !== "undefined") {
						if ("Notification" in window && Notification.permission === "granted") {
							new Notification("Medication Reminder", {
								body: r.title,
							});
						} else {
							alert(`Reminder: ${r.title}`);
						}
						toast.info(`Reminder: ${r.title}`);
					}

					speak(`Reminder: ${r.title}`, activeLang);
					addNovaXMessage(`Reminder: ${r.title}`);
				});

				const serializable = active.map(t => ({
					id: t.id || t.task_id?.toString(),
					title: t.title,
					event_time: t.event_time instanceof Date ? t.event_time.toISOString() : t.event_time,
					type: t.type
				}));
				localStorage.setItem("novax_reminders", JSON.stringify(serializable));
			}

			return active;
		});
	};

	const checkRemindersRef = useRef<() => void>(() => {});
	checkRemindersRef.current = checkReminders;

	useEffect(() => {
		if (typeof window !== "undefined" && "Notification" in window) {
			if (Notification.permission === "default") {
				Notification.requestPermission();
			}
		}

		const intervalId = setInterval(() => {
			checkRemindersRef.current();
		}, 30000);

		return () => {
			clearInterval(intervalId);
		};
	}, []);

	// Voice Recognition Mic toggle
	const toggleListening = () => {
		if (typeof window === "undefined") return;

		// Cancel current synthesis speech before opening the mic
		if (window.speechSynthesis) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
		}

		if (isListening) {
			stopListening();
			return;
		}

		startSpeechRecognition();
	};

	const startSpeechRecognition = () => {
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (!SpeechRecognition) {
			toast.error("Web Speech Recognition is not supported by your browser.");
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.lang = activeLang;

		recognition.onstart = () => {
			setIsListening(true);
		};

		recognition.onresult = (event: any) => {
			const transcript = event.results[0][0].transcript;
			const confidence = event.results[0][0].confidence;

			recognition.stop();
			setIsListening(false);

			if (confidence < 0.5) {
				console.warn("Low Speech Recognition confidence:", confidence);
				const reply = getTranslation("unclear", {}, activeLang);
				addNovaXMessage(reply);
				speak(reply, activeLang);
			} else {
				addUserMessage(transcript);
				handleVoiceCommand(transcript);
			}
		};

		recognition.onerror = (event: any) => {
			console.warn("Speech Recognition Error (Silenced):", event.error);
			setIsListening(false);

			if (event.error === "not-allowed") {
				toast.error("Microphone access is blocked. Please enable it in browser settings.");
			}
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognitionRef.current = recognition;
		recognition.start();
	};

	const stopListening = () => {
		if (recognitionRef.current) {
			recognitionRef.current.stop();
		}
		setIsListening(false);
	};

	// Helper to fetch and display weather
	const handleWeatherQuery = async (query: string) => {
		setIsThinking(true);
		if (process.env.NODE_ENV === "development") {
			console.log("Weather request:", query);
		}
		try {
			const res = await getWeatherAction(query);
			if (process.env.NODE_ENV === "development") {
				console.log("Weather result:", res);
			}
			if (res.success && res.location) {
				const chatText = `🌤️ Weather in ${res.location}: ${res.tempC}°C | Condition: ${res.condition} | Humidity: ${res.humidity}% | Wind Speed: ${res.windSpeed} m/s`;
				const speakText = `Here is the weather in ${res.location}. The temperature is ${res.tempC} degrees Celsius, condition is ${res.condition}, humidity is ${res.humidity} percent, and wind speed is ${res.windSpeed} meters per second.`;
				addNovaXMessage(chatText);
				speak(speakText, activeLang);
			} else {
				const errMsg = res.error === "API key not configured"
					? "Weather API is not configured yet."
					: `Failed to fetch weather data: ${res.error || "Unknown error"}`;
				addNovaXMessage(errMsg);
				speak(errMsg, activeLang);
			}
		} catch (err: any) {
			console.error(err);
			const errMsg = `Failed to fetch weather data: ${err.message || "Unknown error"}`;
			addNovaXMessage(errMsg);
				speak(errMsg, activeLang);
		} finally {
			setIsThinking(false);
		}
	};

	// Helper to save reminder with localStorage fallback
	const saveReminderTask = async (title: string, dateTimeStr: string, speakMode = false, lang = activeLang) => {
		const newId = Date.now().toString();
		const newReminder: TaskItem = {
			id: newId,
			task_id: newId,
			title: title,
			event_time: new Date(dateTimeStr),
			type: "reminder"
		};

		// Immediately update state and save to localStorage
		setReminders(prev => {
			const updated = [newReminder, ...prev];
			localStorage.setItem("novax_reminders", JSON.stringify(updated));
			return updated;
		});

		// Clear form fields
		setManualReminderTitle("");
		setManualReminderDate("");
		setManualReminderTime("");

		// Toast success and add message
		toast.success("Reminder saved successfully");
		addNovaXMessage("✅ Reminder saved successfully.");

		if (speakMode) {
			speak("Reminder saved successfully.", lang);
		}
	};

	// Core voice command handler
	const handleVoiceCommand = async (rawText: string) => {
		const text = rawText.toLowerCase().trim();
		const currentLang = detectLanguage(rawText);

		// If language changed, transition smoothly
		if (currentLang !== activeLang) {
			setActiveLang(currentLang);
		}

		// Handle waiting for weather city name input
		if (waitingForWeatherCity) {
			setWaitingForWeatherCity(false);
			await handleWeatherQuery(rawText);
			return;
		}

		// 1. Emergency SOS confirmation bypass (removed)

		// 1.5. YouTube Command checks
		if (isYouTubeCommand(rawText)) {
			if (typeof window !== "undefined") {
				window.open("https://www.youtube.com", "_blank");
			}
			const reply = "Opening YouTube for you.";
			addNovaXMessage(reply);
			speak(reply, currentLang);
			return;
		}

		// 2. Open Website Commands
		const openResult = parseOpenCommand(rawText);
		if (openResult) {
			const finalUrl = openResult.isKnown 
				? openResult.url 
				: `https://www.google.com/search?q=${encodeURIComponent(rawText)}`;
			if (typeof window !== "undefined") {
				window.open(finalUrl, "_blank");
			}
			const rep = getTranslation("executed_open", { site: openResult.site }, currentLang);
			addNovaXMessage(rep);
			speak(rep, currentLang);
			return;
		}

		// 3. Reminder Intent
		const isReminderCmd = text.includes("remind") || text.includes("reminder") || text.includes("schedule") || text.includes("pill") || text.includes("medicine") ||
			text.includes("याद") || text.includes("अनुस्मारक") || text.includes("మందులు") || text.includes("రిమైండర్") ||
			text.includes("நினைவூட்டல்") || text.includes("மருந்து") || text.includes("ಜ್ಞಾಪನೆ") || text.includes("ಔಷಧಿ") ||
			text.includes("ഓർമ്മിപ്പിക്കുക") || text.includes("മരുന്ന്") || text.includes("অনুস্মারক") || text.includes("ওষুধ") ||
			text.includes("आठवण") || text.includes("औषध") || text.includes("یاددہانی") || text.includes("دوا");

		if (isReminderCmd) {
			if (isIncompleteReminder(rawText)) {
				const incompletePrompt = "What should I remind you about and when?";
				addNovaXMessage(incompletePrompt);
				speak(incompletePrompt, currentLang);
				return;
			}
			setIsThinking(true);
			try {
				const absoluteDateTime = await getDate(rawText);
				const cleanTitle = extractReminderTitle(rawText);
				await saveReminderTask(cleanTitle, absoluteDateTime, true, currentLang);
			} catch (err: any) {
				console.error(err);
				const failText = getTranslation("speak_fail", {}, currentLang);
				addNovaXMessage(failText);
				speak(failText, currentLang);
			} finally {
				setIsThinking(false);
			}
			return;
		}

		// 4. Weather Intent
		const isWeatherCmd = text.includes("weather") || text.includes("forecast") || text.includes("मौसम") || text.includes("వాతావరణం") || text.includes("வானிலை") || text.includes("ಹವಾಮಾನ") || text.includes("കാലാവസ്ഥ") || text.includes("ആবহাওয়া") || text.includes("हवामान") || text.includes("حالات");
		if (isWeatherCmd) {
			if (!selectedLocation) {
				const reqMsg = "Please select your country or city first.";
				addNovaXMessage(reqMsg);
				speak(reqMsg, currentLang);
				toast.warning(reqMsg);
				return;
			}

			setIsThinking(true);
			try {
				const res = await getWeatherAction(`weather in ${selectedLocation.city}`);
				if (!res.success) {
					const msg = res.error === "API key not configured"
						? "Weather API is not configured yet."
						: `Failed to fetch weather data: ${res.error || "Unknown error"}`;
					addNovaXMessage(msg);
					speak(msg, currentLang);
					if (res.error === "API key not configured") {
						toast.warning(msg);
					} else {
						toast.error(msg);
					}
					return;
				}

				const tempC = res.tempC;
				const condition = (res.condition || "").toLowerCase();
				const reply = `The weather in ${selectedLocation.city} is ${tempC}°C and ${condition}.`;
				addNovaXMessage(reply);
				speak(reply, currentLang);
			} catch (err: any) {
				console.error(err);
				const failText = getTranslation("speak_fail", {}, currentLang);
				addNovaXMessage(failText);
				speak(failText, currentLang);
			} finally {
				setIsThinking(false);
			}
			return;
		}

		// 5. Time Intent
		const isTimeCmd = text.includes("time") || text.includes("clock") || text.includes("समय") || text.includes("సమయం") || text.includes("நேరం") || text.includes("ಸಮಯ") || text.includes("സമയം") || text.includes("সময়") || text.includes("वेळ") || text.includes("وقت");
		if (isTimeCmd) {
			if (!selectedLocation) {
				const reqMsg = "Please select your country or city first.";
				addNovaXMessage(reqMsg);
				speak(reqMsg, currentLang);
				toast.warning(reqMsg);
				return;
			}

			const nowTime = new Date().toLocaleTimeString("en-US", {
				timeZone: selectedLocation.timezone,
				hour: "numeric",
				minute: "2-digit",
				hour12: true
			});

			const reply = `It is ${nowTime} in ${selectedLocation.city}, ${selectedLocation.country}.`;
			addNovaXMessage(reply);
			speak(reply, currentLang);
			return;
		}

		// 6. Joke Intent
		const isJokeCmd = text.includes("joke") || text.includes("funny") || text.includes("चुटकुला") || text.includes("జోక్") || text.includes("கதை") || text.includes("ಕಥೆ") || text.includes("തമാശ") || text.includes("গল্প") || text.includes("لطیفہ");
		if (isJokeCmd) {
			const rep = getTranslation("joke", {}, currentLang);
			addNovaXMessage(rep);
			speak(rep, currentLang);
			return;
		}

		// 7. Emergency SOS Intent
		const isSosCmd = text.includes("help") || text.includes("emergency") || text.includes("sos") || text.includes("doctor") || text.includes("accident") || text.includes("अस्पताल") || text.includes("అత్యవసర") || text.includes("உදவி") || text.includes("ತುರ್ತು") || text.includes("സഹായം") || text.includes("জরুরি") || text.includes("ہنگامی");
		if (isSosCmd) {
			triggerEmergencySOS();
			return;
		}

		// 8. Fallback / Unclear prompt
		const unclearPrompt = getTranslation("unclear", {}, currentLang);
		addNovaXMessage(unclearPrompt);
		speak(unclearPrompt, currentLang);
	};

	// Typed chat submission
	const handleSendText = () => {
		if (!chatInput.trim()) return;
		const text = chatInput.trim();
		setChatInput("");

		const detectedLang = detectLanguage(text);
		if (detectedLang !== activeLang) {
			setActiveLang(detectedLang);
		}

		addUserMessage(text);
		handleVoiceCommand(text);
	};

	// Click Quick Commands
	const handleQuickCommandClick = async (commandKey: string) => {
		// Cancel current speech before executing new command click
		if (typeof window !== "undefined" && window.speechSynthesis) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
		}

		if (commandKey === "remind_pills") {
			addUserMessage("Remind heart pills");
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(8, 0, 0, 0);
			const absoluteDateTime = tomorrow.toISOString();
			await saveReminderTask("Heart medication", absoluteDateTime, true, activeLang);

		} else if (commandKey === "check_weather") {
			addUserMessage("Check the weather");
			if (!selectedLocation) {
				const reqMsg = "Please select your country or city first.";
				addNovaXMessage(reqMsg);
				speak(reqMsg, activeLang);
				toast.warning(reqMsg);
				return;
			}
			setIsThinking(true);
			try {
				const res = await getWeatherAction(`weather in ${selectedLocation.city}`);
				if (!res.success) {
					const msg = res.error === "API key not configured"
						? "Weather API is not configured yet."
						: `Failed to fetch weather data: ${res.error || "Unknown error"}`;
					addNovaXMessage(msg);
					speak(msg, activeLang);
					if (res.error === "API key not configured") {
						toast.warning(msg);
					} else {
						toast.error(msg);
					}
					return;
				}

				const tempC = res.tempC;
				const condition = (res.condition || "").toLowerCase();
				const reply = `The weather in ${selectedLocation.city} is ${tempC}°C and ${condition}.`;
				addNovaXMessage(reply);
				speak(reply, activeLang);
			} catch (err) {
				console.error(err);
				const failText = getTranslation("speak_fail", {}, activeLang);
				addNovaXMessage(failText);
				speak(failText, activeLang);
			} finally {
				setIsThinking(false);
			}

		} else if (commandKey === "check_time") {
			addUserMessage("What time is it?");
			if (!selectedLocation) {
				const reqMsg = "Please select your country or city first.";
				addNovaXMessage(reqMsg);
				speak(reqMsg, activeLang);
				toast.warning(reqMsg);
				return;
			}
			const nowTime = new Date().toLocaleTimeString("en-US", {
				timeZone: selectedLocation.timezone,
				hour: "numeric",
				minute: "2-digit",
				hour12: true
			});
			const reply = `It is ${nowTime} in ${selectedLocation.city}, ${selectedLocation.country}.`;
			addNovaXMessage(reply);
			speak(reply, activeLang);

		} else if (commandKey === "emergency_sos") {
			triggerEmergencySOS();
		}
	};

	// Manual Reminder Creator
	const handleManualReminderSubmit = async (speakMode = false) => {
		if (!manualReminderTitle.trim()) {
			toast.error("Please specify what needs to be reminded.");
			return;
		}
		if (!manualReminderDate || !manualReminderTime) {
			toast.error("Please pick a date and time for the reminder.");
			return;
		}

		if (typeof window !== "undefined" && window.speechSynthesis) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
		}

		const dateTimeStr = `${manualReminderDate}T${manualReminderTime}`;
		await saveReminderTask(manualReminderTitle, dateTimeStr, speakMode, activeLang);
	};

	// Delete Reminder action
	const handleDeleteReminder = async (id: number | string | undefined) => {
		if (!id) return;
		const updated = reminders.filter(t => (t.task_id !== id && t.id !== id));
		setReminders(updated);

		const serializable = updated.map(t => ({
			id: t.id || t.task_id?.toString(),
			title: t.title,
			event_time: t.event_time instanceof Date ? t.event_time.toISOString() : t.event_time,
			type: t.type
		}));
		localStorage.setItem("novax_reminders", JSON.stringify(serializable));

		toast.success("Reminder deleted successfully.");
	};

	// Trigger emergency alert workflow
	const triggerEmergencySOS = async () => {
		if (typeof window !== "undefined" && window.speechSynthesis) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
		}

		addUserMessage("Trigger emergency help protocol");

		if (!caregiverPhone || !caregiverPhone.trim()) {
			const msg = "Please add caregiver emergency contact first.";
			addNovaXMessage(msg);
			speak(msg, activeLang);
			toast.warning(msg);
			return;
		}

		const fullPhone = (caregiverPhoneCode || "") + caregiverPhone;

		// Directly call caregiver using saved caregiver number
		if (typeof window !== "undefined") {
			window.location.href = `tel:${fullPhone}`;
		}

		// Also send SMS if Twilio is configured
		const res = await triggerEmergencyAction(fullPhone);
		if (res.success) {
			const msg = "Emergency alert sent to caregiver successfully.";
			addNovaXMessage(msg);
			speak(msg, activeLang);
			toast.success(msg);
		} else {
			if (res.error === "Twilio not configured") {
				const caregiverNumber = (caregiverPhoneCode ? caregiverPhoneCode + " " : "") + caregiverPhone;
				const msg = `Demo mode: Emergency alert sent to ${caregiverName} at ${caregiverNumber}.`;
				addNovaXMessage(msg);
				speak(msg, activeLang);
				toast.info(msg);
			} else {
				const msg = `Failed to send emergency alert: ${res.error}`;
				addNovaXMessage(msg);
				speak(msg, activeLang);
				toast.error(msg);
			}
		}
	};

	// Confirmation Handlers (Interactive Buttons - Unused for SOS, stubbed for JSX safety)
	const handleConfirmYes = async () => {};
	const handleConfirmNo = () => {};

	// Helper for Orb Pulsing Color (Solid Bright Blue)
	const getOrbGradient = () => {
		if (isListening) return "from-[#2563EB] via-[#3B82F6] to-[#1D4ED8] animate-pulse";
		if (isSpeaking) return "from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] animate-pulse";
		return "from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB]";
	};

	const getOrbLabel = () => {
		if (isListening) return "NovaX is Listening...";
		if (isSpeaking) return "NovaX is Speaking...";
		return "Click to Talk to NovaX AI";
	};

	return (
		<TooltipProvider>
			{/* Primary Background is clean white with soft light blue background #F8FBFF, text is slate-700 */}
			<div className="relative min-h-screen bg-[#F8FBFF] text-[#4B5563] flex flex-col justify-between overflow-x-hidden font-sans">
				{/* Subtle dotted light-blue background pattern */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: `radial-gradient(circle at 1px 1px, #D0E1FD 1.5px, transparent 0)`,
							backgroundSize: "28px 28px",
						}}
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-[#F8FBFF] via-[#FFFFFF]/80 to-[#F8FBFF]" />
				</div>

				{/* Header */}
				<header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-[#E5E7EB] bg-[#FFFFFF]/80 backdrop-blur-md rounded-b-2xl shadow-sm">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-md">
							<span className="font-bold text-white text-lg tracking-wider">N</span>
						</div>
						<div>
							<h1 className="text-xl font-bold tracking-tight text-[#111827] flex items-baseline gap-1.5">
								NovaX AI <span className="text-xs font-light text-[#2563EB] border border-[#2563EB]/20 px-2 py-0.5 rounded-full bg-[#EFF6FF]">v2.0</span>
							</h1>
							<p className="text-[10px] text-[#6B7280] uppercase tracking-widest">Intelligent Elder Companion</p>
						</div>
					</div>

					<div className="flex items-center gap-4">
						{/* Notifications bubble */}
						<div className="relative p-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl hover:bg-[#F3F4F6] transition-colors shadow-sm">
							<FaBell className="w-4 h-4 text-[#4B5563]" />
							{unreadCount > 0 && (
								<span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
									{unreadCount}
								</span>
							)}
						</div>

						{/* Settings Trigger */}
						<button
							onClick={() => setIsSettingsOpen(true)}
							className="p-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl hover:bg-[#F8FBFF] hover:text-[#2563EB] transition-all hover:scale-105 duration-200 text-[#4B5563] flex items-center gap-2 shadow-sm"
						>
							<FaCog className="w-4 h-4 text-[#2563EB]" />
							<span className="text-xs font-semibold hidden sm:inline">Voice Settings</span>
						</button>
					</div>
				</header>

				{/* Main Body */}
				<main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* Left Section: Talk to NovaX AI & Quick Commands */}
					<section className="lg:col-span-7 space-y-6 flex flex-col">
						{/* Visualizer & Orb Panel (Talk to NovaX AI) */}
						<div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-soft min-h-[300px]">
							{/* Pulse Orb */}
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={toggleListening}
								className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br ${getOrbGradient()} flex items-center justify-center shadow-md transition-all duration-500 z-10 group`}
							>
								{/* Pulsing rings around orb */}
								<AnimatePresence>
									{(isListening || isSpeaking) && (
										<>
											<motion.div
												initial={{ scale: 1, opacity: 0.6 }}
												animate={{ scale: [1, 1.4, 1.8], opacity: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
												className="absolute inset-0 rounded-full border-2 border-[#2563EB]"
											/>
											<motion.div
												initial={{ scale: 1, opacity: 0.6 }}
												animate={{ scale: [1, 1.3, 1.6], opacity: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
												className="absolute inset-0 rounded-full border-2 border-[#DBEAFE]"
											/>
										</>
									)}
								</AnimatePresence>

								{/* Audio Wave visualizer or Mic Icon */}
								{isListening || isSpeaking ? (
									<AudioWave isListening={true} />
								) : (
									<FaMicrophone className="w-16 h-16 text-white group-hover:scale-110 transition-transform duration-300" />
								)}
							</motion.button>

							<p className="mt-8 text-sm font-semibold tracking-wide text-[#111827] uppercase select-none z-10">
								{getOrbLabel()}
							</p>
							<p className="text-xs text-[#4B5563] mt-1 select-none z-10">
								{isListening ? "Say command now..." : "Speak naturally or write text on the right"}
							</p>
						</div>

						{/* Quick Commands Panel (Left Bottom) */}
						<div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-6 shadow-soft">
							<h2 className="text-xs font-bold text-[#4B5563] uppercase tracking-widest mb-4">Quick Voice & Chat Commands</h2>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Remind pills command */}
								<button
									onClick={() => handleQuickCommandClick("remind_pills")}
									className="group text-left p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#F8FBFF] shadow-sm transition-all duration-300"
								>
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-xl bg-[#F3F4F6] group-hover:bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] transition-colors">
											<FaBell className="w-4 h-4" />
										</div>
										<div>
											<span className="text-sm font-semibold text-[#111827] block">Remind heart pills</span>
											<div className="flex items-center gap-1.5 mt-1 select-none">
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">🎤 Voice</span>
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">💬 Chat</span>
											</div>
										</div>
									</div>
								</button>

								{/* Weather command */}
								<button
									onClick={() => handleQuickCommandClick("check_weather")}
									className="group text-left p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#F8FBFF] shadow-sm transition-all duration-300"
								>
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-xl bg-[#F3F4F6] group-hover:bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] transition-colors">
											<FaCalendarAlt className="w-4 h-4" />
										</div>
										<div>
											<span className="text-sm font-semibold text-[#111827] block">Check weather</span>
											<div className="flex items-center gap-1.5 mt-1 select-none">
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">🎤 Voice</span>
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">💬 Chat</span>
											</div>
										</div>
									</div>
								</button>

								{/* Time command */}
								<button
									onClick={() => handleQuickCommandClick("check_time")}
									className="group text-left p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#F8FBFF] shadow-sm transition-all duration-300"
								>
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-xl bg-[#F3F4F6] group-hover:bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] transition-colors">
											<FaComments className="w-4 h-4" />
										</div>
										<div>
											<span className="text-sm font-semibold text-[#111827] block">What time is it?</span>
											<div className="flex items-center gap-1.5 mt-1 select-none">
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">🎤 Voice</span>
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">💬 Chat</span>
											</div>
										</div>
									</div>
								</button>

								{/* SOS command */}
								<button
									onClick={() => handleQuickCommandClick("emergency_sos")}
									className="group text-left p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] hover:border-red-500 hover:bg-red-50/30 shadow-sm transition-all duration-300"
								>
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center text-red-600 transition-colors">
											<FaExclamationTriangle className="w-4 h-4 text-red-500" />
										</div>
										<div>
											<span className="text-sm font-semibold text-red-600 block">Emergency SOS</span>
											<div className="flex items-center gap-1.5 mt-1 select-none">
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">🎤 Voice</span>
												<span className="text-[9px] font-medium bg-[#F8FBFF] px-1.5 py-0.5 rounded text-[#4B5563] border border-[#E5E7EB]">💬 Chat</span>
											</div>
										</div>
									</div>
								</button>
							</div>
						</div>
					</section>

					{/* Right Section: Active Schedule & Reminders & Conversation History */}
					<section className="lg:col-span-5 space-y-6">
						{/* Manual Reminder Input Form */}
						<div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-6 shadow-soft">
							<h2 className="text-base font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
								<FaCalendarAlt className="text-[#2563EB]" /> Schedule Reminder
							</h2>

							<div className="space-y-4">
								<div className="space-y-1">
									<label className="text-xs text-[#4B5563] font-semibold uppercase tracking-wider block">Reminder Text</label>
									<input
										type="text"
										value={manualReminderTitle}
										onChange={(e) => setManualReminderTitle(e.target.value)}
										placeholder="e.g. Take heart pills, Doctor Appointment"
										className="w-full bg-[#F8FBFF] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] placeholder-gray-400 transition-all"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-xs text-[#4B5563] font-semibold uppercase tracking-wider block">Date</label>
										<input
											type="date"
											value={manualReminderDate}
											onChange={(e) => setManualReminderDate(e.target.value)}
											className="w-full bg-[#F8FBFF] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-xs text-[#4B5563] font-semibold uppercase tracking-wider block">Time</label>
										<input
											type="time"
											value={manualReminderTime}
											onChange={(e) => setManualReminderTime(e.target.value)}
											className="w-full bg-[#F8FBFF] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
										/>
									</div>
								</div>

								{/* Action buttons */}
								<div className="grid grid-cols-2 gap-4 pt-2">
									<button
										type="button"
										onClick={() => handleManualReminderSubmit(false)}
										className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] duration-200 flex items-center justify-center gap-1.5"
									>
										<FaCheck /> Save Reminder
									</button>
									<button
										type="button"
										onClick={() => handleManualReminderSubmit(true)}
										className="w-full py-2.5 bg-[#F8FBFF] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-[#4B5563] rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] duration-200 flex items-center justify-center gap-1.5"
									>
										<FaVolumeUp className="text-[#2563EB]" /> Speak Reminder
									</button>
								</div>
							</div>
						</div>

						{/* Active Reminders List */}
						<div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-6 shadow-soft">
							<h2 className="text-base font-bold text-[#111827] mb-4 flex items-center justify-between border-b border-[#E5E7EB] pb-3">
								<span className="flex items-center gap-2">
									<FaBell className="text-[#2563EB]" /> Active Reminders
								</span>
								<span className="text-xs text-[#2563EB] bg-[#EFF6FF] border border-[#2563EB]/20 px-2 py-0.5 rounded-full font-medium">
									{reminders.length} Active
								</span>
							</h2>

							<div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E5E7EB] scrollbar-track-transparent">
								{isLoadingReminders ? (
									<div className="flex items-center justify-center py-8 gap-2 text-gray-400">
										<FaSync className="animate-spin text-sm text-[#2563EB]" />
										<span className="text-sm">Loading reminders...</span>
									</div>
								) : reminders.length === 0 ? (
									<div className="text-center py-8 text-[#4B5563]">
										<p className="text-sm">No active reminders found</p>
										<p className="text-xs mt-1">Add one above or speak to NovaX AI</p>
									</div>
								) : (
									reminders.map((rem) => {
										const dateTime = rem.event_time;
										return (
											<div
												key={rem.task_id || rem.id}
												className="flex items-center justify-between p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm hover:border-[#2563EB]/40 transition-colors"
											>
												<div className="flex-1 min-w-0 pr-3">
													<span className="text-sm font-semibold text-[#111827] block truncate">{rem.title}</span>
													<span className="text-xs text-[#4B5563] block mt-0.5">{formatDateTimeReadable(dateTime)}</span>
												</div>
												<button
													onClick={() => handleDeleteReminder(rem.task_id || rem.id)}
													className="p-2.5 hover:bg-[#F8FBFF] text-[#4B5563] hover:text-red-600 rounded-xl transition-all hover:scale-105 duration-200"
													title="Delete reminder"
												>
													<FaTrash className="w-3.5 h-3.5" />
												</button>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* Conversation History (Moved to Right Bottom) */}
						<div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-6 shadow-soft h-[350px] flex flex-col justify-between">
							<h2 className="text-sm font-bold text-[#4B5563] uppercase tracking-widest mb-3 border-b border-[#E5E7EB] pb-2 flex items-center gap-2">
								<FaComments className="text-[#2563EB]" /> Conversation History
							</h2>
							
							{/* Scrollable messages area */}
							<div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-[#E5E7EB] scrollbar-track-transparent">
								{messages.map((msg, index) => (
									<div
										key={index}
										className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
									>
										<span className="text-[10px] text-[#4B5563] mb-1 px-2">
											{msg.sender === "user" ? "You" : "NovaX AI"}
										</span>
										
										<div
											className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
												msg.sender === "user"
													? "bg-[#2563EB] text-white rounded-tr-none"
													: "bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] rounded-tl-none"
											}`}
										>
											<p className="text-sm leading-relaxed">{msg.text}</p>
											
											{/* Gated confirmation triggers (Interactive Yes/No buttons) */}
											{msg.isConfirmation && (
												<div className="flex items-center gap-3 mt-3 border-t border-[#E5E7EB]/50 pt-3">
													<button
														onClick={handleConfirmYes}
														className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950/10"
													>
														<FaCheck className="text-[10px]" /> Yes
													</button>
													<button
														onClick={handleConfirmNo}
														className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-rose-950/10"
													>
														<FaTimes className="text-[10px]" /> No
													</button>
												</div>
											)}
										</div>
									</div>
								))}
								{isThinking && (
									<div className="flex flex-col items-start">
										<span className="text-[10px] text-[#4B5563] mb-1 px-2">NovaX AI</span>
										<div className="bg-[#F3F4F6] text-[#111827] rounded-2xl rounded-tl-none px-4 py-3 border border-[#E5E7EB] flex items-center gap-2 shadow-sm">
											<FaSync className="animate-spin text-xs text-[#2563EB]" />
											<span className="text-xs">Processing intent...</span>
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>

							{/* Chat text input mode */}
							<div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E5E7EB]">
								<input
									type="text"
									value={chatInput}
									onChange={(e) => setChatInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSendText()}
									placeholder="Ask NovaX or type a command..."
									className="flex-1 bg-[#F8FBFF] border border-[#E5E7EB] rounded-2xl px-4 py-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] placeholder-gray-400 transition-all shadow-inner"
								/>
								<button
									onClick={handleSendText}
									className="p-3 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-2xl text-white transition-colors shadow-md"
								>
									<FaPaperPlane className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					</section>
				</main>

				{/* Footer */}
				<footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-[#E5E7EB] bg-[#FFFFFF]/40 backdrop-blur-md mt-8 text-center text-xs text-[#4B5563]">
					NovaX AI Premium Elderly Companion Dashboard &copy; 2026
				</footer>

				{/* Floating Emergency SOS Button */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.8 }}
					className="fixed bottom-6 right-6 z-30"
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
								onClick={triggerEmergencySOS}
								className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-red-600 to-red-500 rounded-full shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:shadow-[0_16px_48px_rgba(239,68,68,0.5)] border border-red-300/20"
							>
								{/* Pulsing red ring background */}
								<div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25 blur-sm" />
								
								{/* Pulse Background */}
								<div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600 to-red-500 animate-pulse opacity-50 blur-lg" />

								{/* Icon */}
								<FaPhoneAlt className="relative w-6 h-6 sm:w-8 sm:h-8 text-white" />
							</motion.button>
						</TooltipTrigger>
						<TooltipContent className="bg-red-950 text-white border-red-800">
							<p className="font-bold">EMERGENCY ASSISTANCE (Press to call help)</p>
						</TooltipContent>
					</Tooltip>
				</motion.div>

				{/* Settings Drawer Panel */}
				<SettingsPanel
					isOpen={isSettingsOpen}
					onClose={() => setIsSettingsOpen(false)}
					voices={voices}
					selectedVoiceName={selectedVoiceName}
					setSelectedVoiceName={setSelectedVoiceName}
					voiceRate={voiceRate}
					setVoiceRate={setVoiceRate}
					voicePitch={voicePitch}
					setVoicePitch={setVoicePitch}
					voiceVolume={voiceVolume}
					setVoiceVolume={setVoiceVolume}
					activeLang={activeLang}
					setActiveLang={setActiveLang}
					autoDetectLang={autoDetectLang}
					setAutoDetectLang={setAutoDetectLang}
					voiceGenderPref={voiceGenderPref}
					setVoiceGenderPref={setVoiceGenderPref}
					onPreviewVoice={handlePreviewVoice}
					selectedLocation={selectedLocation}
					setSelectedLocation={setSelectedLocation}
					caregiverName={caregiverName}
					setCaregiverName={setCaregiverName}
					caregiverPhone={caregiverPhone}
					setCaregiverPhone={setCaregiverPhone}
					caregiverCountry={caregiverCountry}
					setCaregiverCountry={setCaregiverCountry}
					caregiverPhoneCode={caregiverPhoneCode}
					setCaregiverPhoneCode={setCaregiverPhoneCode}
				/>
			</div>
		</TooltipProvider>
	);
}
