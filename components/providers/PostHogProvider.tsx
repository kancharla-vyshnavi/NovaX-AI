"use client";

import posthog from "posthog-js";
import { PostHogProvider as OriginalPostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

// Check that PostHog is client-side
if (typeof window !== "undefined") {
	if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
			// Enable debug mode in development
			loaded: (posthog) => {
				if (process.env.NODE_ENV === "development") posthog.debug();
			},
			capture_pageview: false, // We'll manually capture pageviews
		});
	} else {
		console.warn("PostHog key is not set. Analytics disabled.");
		// Stub out posthog capture to prevent errors when calling posthog.capture directly in code
		const noop = () => {};
		(posthog as any).capture = noop;
		(posthog as any).identify = noop;
		(posthog as any).reset = noop;
	}
}

export function PostHogPageview(): null {
	useEffect(() => {
		// Track pageview
		posthog.capture("$pageview");
	}, []);

	return null;
}

export default function PostHogProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<OriginalPostHogProvider client={posthog}>
			{children}
		</OriginalPostHogProvider>
	);
}
