const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3031").replace(
	/\/+$/,
	"",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
	async rewrites() {
		return [
			{
				source: "/api/gigachat/:path*",
				destination: `${apiBase}/api/gigachat/:path*`,
			},
			{
				source: "/api/yandexgpt/:path*",
				destination: `${apiBase}/api/yandexgpt/:path*`,
			},
			{
				source: "/api/health",
				destination: `${apiBase}/api/health`,
			},
		];
	},
};

export default nextConfig;
