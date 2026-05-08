"use client";

import { TopBar, GnomeWindow, AuthModal } from "@/components/GnomeUI";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

const HomePage = () => {
	const { user } = useAuth();
	const [isAuthOpen, setIsAuthOpen] = useState(false);
	const router = useRouter();

	const handleStartClick = (e: React.MouseEvent) => {
		if (!user) {
			e.preventDefault();
			setIsAuthOpen(true);
		}
	};

	return (
		<main className="h-screen w-screen overflow-hidden flex flex-col">
			<TopBar />

			<div className="flex-grow flex items-center justify-center p-4 mt-8">
				<GnomeWindow title="Интерактивная система обучения">
					<article className="prose prose-slate max-w-none">
						<h1>Почему традиционное обучение по текстам неэффективно?</h1>

						<p className="text-lg text-gray-600 italic mb-8">
							Человек читает статью, думает, что понял, но через день не может воспроизвести материал. Почему так происходит?
						</p>

						<section className="space-y-8">
							<div>
								<h2>1. Пассивное потребление</h2>
								<p>
									Чтение создаёт <strong>иллюзию понимания</strong>. Когда мы просто скользим глазами по строчкам, мозг не напрягается. Информация проходит "транзитом", не закрепляясь в долгосрочной памяти, так как отсутствуют активные когнитивные усилия.
								</p>
							</div>

							<div>
								<h2>2. Отсутствие обратной связи</h2>
								<p>
									После прочтения статьи никто не проверяет, что именно вы усвоили. Можно прочитать сложный материал про нейросети и уйти с полным непониманием фундаментальных основ, таких как <em>backpropagation</em>, даже не осознав этого.
								</p>
							</div>

							<div>
								<h2>3. Отсутствие давления</h2>
								<p>
									Без четких дедлайнов и реальных ставок внимание рассеивается. Легко отвлечься на уведомление, перечитывать один и тот же абзац пять раз или просто листать дальше, так и не вникнув в суть написанного.
								</p>
							</div>

							<div>
								<h2>4. Отсутствие персонализации</h2>
								<p>
									Традиционные тексты статичны. Все читают один и тот же материал, хотя у каждого студента свои уникальные пробелы в знаниях, разный бэкграунд и скорость восприятия информации.
								</p>
							</div>

							<div>
								<h2>5. Отсутствие артефакта</h2>
								<p>
									После классического обучения часто не остается ничего осязаемого. Нет документа или отчета в духе:
									<span className="block mt-2 p-3 bg-gray-100 border-l-4 border-ubuntu-orange font-mono text-sm">
										"Я изучил тему X, глубоко понял аспект Y, но совершил ошибку в Z и теперь знаю, как её исправить".
									</span>
								</p>
							</div>
						</section>

						<div className="mt-12 p-6 bg-ubuntu-dark text-white rounded-lg shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex-grow">
								<h3 className="text-white text-xl mb-2">Готовы изменить подход?</h3>
								<p className="mb-0 opacity-90">
									Наша интерактивная система обучения решает эти проблемы, превращая пассивное чтение в активный процесс с участием нейронных сетей.
								</p>
							</div>
							<Link
								href="/knowledgeJourney"
								onClick={handleStartClick}
								className="shrink-0 bg-ubuntu-orange hover:bg-[#ff632d] text-white font-bold py-3 px-8 rounded-md shadow-lg transition-all active:scale-95 flex items-center gap-2"
							>
								Начать обучение
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</Link>
						</div>
					</article>
				</GnomeWindow>
			</div>
			<AuthModal
				isOpen={isAuthOpen}
				onClose={() => setIsAuthOpen(false)}
				onSuccess={() => router.push('/knowledgeJourney')}
			/>
		</main>
	);
};

export default HomePage;
