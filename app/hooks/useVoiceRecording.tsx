import { useCallback, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

interface UseVoiceRecordingProps {
	onRecordingComplete?: (blob: Blob) => void;
	onError?: (error: string) => void;
	onStartRecording?: () => void;
	onStopRecording?: () => void;
}

interface UseVoiceRecordingReturn {
	isRecording: boolean;
	isPermissionGranted: boolean;
	toggleRecording: () => Promise<void>;
}

export const useVoiceRecording = ({
	onRecordingComplete,
	onError,
	onStartRecording,
	onStopRecording,
}: UseVoiceRecordingProps = {}): UseVoiceRecordingReturn => {
	const [isPermissionGranted, setIsPermissionGranted] = useState(false);

	const handleStop = useCallback(
		(blobUrl: string) => {
			fetch(blobUrl)
				.then((response) => response.blob())
				.then((blob) => {
					onRecordingComplete?.(blob);
				})
				.catch((error) => {
					onError?.(error instanceof Error ? error.message : String(error));
				});
		},
		[onRecordingComplete, onError]
	);

	const {
		status,
		startRecording: start,
		stopRecording: stop,
		clearBlobUrl,
	} = useReactMediaRecorder({
		audio: true,
		video: false,
		onStop: handleStop,
		askPermissionOnMount: true,
		mediaRecorderOptions: {
			mimeType: "audio/webm",
		},
	});

	const startRecording = useCallback(async () => {
		if (!isPermissionGranted) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				stream.getTracks().forEach((track) => track.stop());
				setIsPermissionGranted(true);
			} catch (error) {
				onError?.(
					error instanceof Error
						? error.message
						: "Failed to get microphone permission"
				);
				return;
			}
		}
		onStartRecording?.();
		start();
	}, [isPermissionGranted, onStartRecording, start, onError]);

	const stopRecording = useCallback(() => {
		stop();
		clearBlobUrl();
		onStopRecording?.();
	}, [stop, clearBlobUrl, onStopRecording]);

	const toggleRecording = useCallback(async () => {
		if (status === "recording") {
			stopRecording();
		} else {
			await startRecording();
		}
	}, [status, startRecording, stopRecording]);

	return {
		isRecording: status === "recording",
		isPermissionGranted,
		toggleRecording,
	};
};
