"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/GnomeUI";
import { useAuth } from "@/lib/AuthContext";

const StartLearningButton = () => {
	const { user } = useAuth();
	const [isAuthOpen, setIsAuthOpen] = useState(false);
	const router = useRouter();

	const handleClick = (e: React.MouseEvent) => {
		if (!user) {
			e.preventDefault();
			setIsAuthOpen(true);
		}
	};

	return (
		<>
			<Link
				href="/knowledgeJourney"
				onClick={handleClick}
				className="inline-flex items-center justify-center gap-2 bg-ubuntu-orange hover:bg-[#ff632d] text-white font-bold py-3 px-8 rounded-md shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubuntu-orange focus-visible:ring-offset-2"
			>
				Начать обучение
				<svg
					aria-hidden="true"
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
				</svg>
			</Link>
			<AuthModal
				isOpen={isAuthOpen}
				onClose={() => setIsAuthOpen(false)}
				onSuccess={() => router.push("/knowledgeJourney")}
			/>
		</>
	);
};

export default StartLearningButton;
