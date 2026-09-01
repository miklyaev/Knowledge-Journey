import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import StartLearningButton from "@/components/StartLearningButton";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Knowledge Journey — интерактивное обучение с ИИ",
	description:
		"Выберите тему, и ИИ-ассистент проведёт вас по маршруту обучения: вопросы разных форматов, проверка свободных ответов и журнал успехов. Начните бесплатно.",
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Knowledge Journey — интерактивное обучение с ИИ",
		description:
			"Выберите тему, и ИИ-ассистент проведёт вас по маршруту обучения: вопросы разных форматов, проверка свободных ответов и журнал успехов.",
		url: "/",
		locale: "ru_RU",
		siteName: "Knowledge Journey",
		type: "website",
	},
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: "Knowledge Journey",
	url: SITE_URL,
	applicationCategory: "EducationalApplication",
	operatingSystem: "Web",
	inLanguage: "ru",
	description:
		"Интерактивная система обучения с ИИ-ассистентом: маршрут по выбранной теме, вопросы разных форматов, проверка свободных ответов и журнал успехов.",
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "RUB",
	},
};

const steps = [
	{
		title: "Выберите тему",
		text: "От алгоритмов C# до нейросетей — выберите готовую тему или загрузите собственный PDF-материал.",
	},
	{
		title: "Пройдите маршрут",
		text: "ИИ-ассистент задаёт вопросы разных форматов: выбор ответа, сопоставление, восстановление последовательности и свободный ответ.",
	},
	{
		title: "Получите разбор",
		text: "ИИ оценивает каждый ответ, объясняет ошибки и сохраняет результат в журнал успехов.",
	},
];

const features = [
	{
		title: "Активное воспроизведение",
		text: "Вместо пассивного чтения вы отвечаете на вопросы — информация закрепляется в памяти, а не проходит «транзитом».",
	},
	{
		title: "Проверка свободных ответов",
		text: "ИИ анализирует формулировку своими словами и оценивает понимание, а не угадывание варианта.",
	},
	{
		title: "Персональная обратная связь",
		text: "После каждого шага ИИ объясняет, что вы усвоили, а где ошиблись, и подсказывает, что повторить.",
	},
	{
		title: "Журнал успехов",
		text: "Каждый маршрут сохраняется: темы, баллы и разбор ошибок доступны в любой момент.",
	},
];

export default function HomePage() {
	return (
		<>
			<TopBar />
			<main className="flex-grow flex items-start justify-center p-4 pt-12">
				<GnomeWindow title="Knowledge Journey — интерактивное обучение с ИИ" hideSidebar fitContent>
					<article className="prose prose-slate max-w-none">
						<section className="not-prose">
							<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
								Персональное обучение с ИИ
							</h1>
							<p className="text-lg text-gray-600 mb-8">
								Knowledge Journey превращает чтение в активное обучение. Выберите тему — и ИИ-ассистент проведёт вас по маршруту из вопросов, проверит свободные ответы и сохранит прогресс в журнал успехов.
							</p>
							<div className="mb-10">
								<StartLearningButton />
							</div>
						</section>

						<section aria-labelledby="how-it-works">
							<h2 id="how-it-works">Как это работает</h2>
							<ol className="space-y-6 not-prose">
								{steps.map((step, index) => (
									<li key={step.title} className="flex gap-4">
										<span
											className="shrink-0 w-8 h-8 rounded-full bg-ubuntu-orange text-white font-bold flex items-center justify-center"
											aria-hidden="true"
										>
											{index + 1}
										</span>
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
											<p className="mb-0 text-gray-600">{step.text}</p>
										</div>
									</li>
								))}
							</ol>
						</section>

						<section aria-labelledby="features">
							<h2 id="features">Что вы получаете</h2>
							<div className="grid md:grid-cols-2 gap-6 not-prose">
								{features.map((feature) => (
									<div
										key={feature.title}
										className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
									>
										<h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
										<p className="mb-0 text-gray-600">{feature.text}</p>
									</div>
								))}
							</div>
						</section>

						<section className="mt-12 p-6 bg-ubuntu-dark text-white rounded-lg shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex-grow">
								<h2 className="text-white text-xl mb-2">Готовы изменить подход?</h2>
								<p className="mb-0 opacity-90">
									Пройдите первый маршрут за несколько минут — без установки и лишних шагов.
								</p>
							</div>
							<StartLearningButton />
						</section>
					</article>
				</GnomeWindow>
			</main>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
		</>
	);
}
