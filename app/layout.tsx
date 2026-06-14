import PostHogProvider, {
	PostHogPageview,
} from "@/components/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "VoiceCare - AI Companion for Elderly",
	description:
		"An AI-powered voice companion providing medication reminders, appointment scheduling, and companionship for seniors.",
	keywords:
		"elderly care, AI companion, voice assistant, medication reminders, senior care",
	authors: [{ name: "VoiceCare Team" }],
	openGraph: {
		title: "VoiceCare - AI Companion for Elderly",
		description: "AI-powered voice companion for senior care and companionship",
		type: "website",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
			>
				<PostHogProvider>
					<PostHogPageview />
					{children}
					<Toaster />
				</PostHogProvider>
			</body>
		</html>
	);
}
