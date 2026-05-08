"use client";

import React from 'react';
import Link from 'next/link';

interface WindowProps {
	title: string;
	children: React.ReactNode;
}

export const GnomeWindow: React.FC<WindowProps> = ({ title, children }) => {
	return (
		<div className="gnome-window w-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
			<div className="gnome-header shrink-0">
				<div className="flex gap-2 w-20">
					<div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-inner" />
					<div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-inner" />
					<div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-inner" />
				</div>
				<span className="text-2xl font-semibold text-gray-600 truncate px-2">{title}</span>
				<div className="w-20" />
			</div>
			<div className="gnome-content bg-white overflow-y-auto flex-grow">
				{children}
			</div>
		</div>
	);
};

export const TopBar: React.FC = () => {
	return (
		<div className="gnome-top-bar">
			<div className="flex items-center gap-1 h-full">
				<Link href="/" className="hover:bg-white/10 px-3 py-1 rounded cursor-default transition-colors flex items-center gap-2">
					<span className="font-bold">Главная</span>
				</Link>
				<Link href="/knowledgeJourney" className="hover:bg-white/10 px-3 py-1 rounded cursor-default transition-colors flex items-center gap-2">
					<span className="font-medium opacity-90">Маршрут обучения</span>
				</Link>
			</div>			<div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
				<span className="text-xs font-bold">8 мая 15:40</span>
			</div>
			<div className="flex-grow" />
			<div className="flex items-center gap-4">
				<div className="flex gap-3 items-center opacity-90">
					<div className="flex gap-1">
						<div className="w-1 h-3 bg-white rounded-full" />
						<div className="w-1 h-3 bg-white rounded-full" />
						<div className="w-1 h-3 bg-white/30 rounded-full" />
					</div>
					<div className="w-4 h-4 bg-white rounded-sm" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }} />
				</div>
			</div>
		</div>
	);
};
