import { motion } from "framer-motion";

interface AudioWaveProps {
	isListening: boolean;
}

export const AudioWave = ({ isListening }: AudioWaveProps) => {
	// Create more bars for a richer visualization
	const bars = Array.from({ length: 12 }, (_, i) => i);

	console.log(isListening);

	return (
		<div className="flex items-center justify-center gap-1.5 h-24 w-24">
			{bars.map((i) => (
				<motion.div
					key={i}
					className="w-1.5 bg-white/90 rounded-full"
					initial={{
						height: `${Math.sin((i / bars.length) * Math.PI) * 100}%`,
					}}
					animate={{
						height: [
							`${Math.sin((i / bars.length) * Math.PI) * 100}%`,
							`${Math.sin((i / bars.length) * Math.PI) * 60}%`,
							`${Math.sin((i / bars.length) * Math.PI) * 80}%`,
							`${Math.sin((i / bars.length) * Math.PI) * 40}%`,
							`${Math.sin((i / bars.length) * Math.PI) * 100}%`,
						],
						opacity: [0.9, 1, 0.9, 1, 0.9],
					}}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.1,
						repeatType: "reverse",
					}}
				/>
			))}
		</div>
	);
};
