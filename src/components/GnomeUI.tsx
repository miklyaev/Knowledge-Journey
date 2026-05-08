"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { User, Users, LogOut, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface WindowProps {
	title: string;
	children: React.ReactNode;
}

export const GnomeWindow: React.FC<WindowProps> = ({ title, children }) => {
	return (
		<div className="flex items-start justify-center gap-4 w-full max-w-7xl mx-auto animate-in fade-in zoom-in duration-300">
			{/* Основное окно */}
			<div className="gnome-window flex-grow flex flex-col max-h-[85vh]">
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

			{/* Отдельный блок справа */}
			<aside className="w-64 bg-[#ebebeb]/90 backdrop-blur-md rounded-gnome shadow-gnome border border-gray-400/30 p-4 max-h-[85vh] overflow-y-auto shrink-0">
				<div className="space-y-6">
					<div>
						<div className="flex items-center gap-2 text-gray-500 mb-3">
							<User size={16} />
							<span className="text-xs font-bold uppercase tracking-wider">Текущий пользователь</span>
						</div>
						<CurrentUserDisplay />
					</div>
					<div>
						<div className="flex items-center gap-2 text-gray-500 mb-3">
							<Users size={16} />
							<span className="text-xs font-bold uppercase tracking-wider">Все пользователи</span>
						</div>
						<UsersList />
					</div>
				</div>
			</aside>
		</div>
	);
};

const CurrentUserDisplay = () => {
	const { user, logout } = useAuth();
	if (!user) return <div className="text-sm text-gray-400 italic">Не авторизован</div>;
	return (
		<div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="font-bold text-ubuntu-orange">{user}</span>
				<button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Выйти">
					<LogOut size={14} />
				</button>
			</div>
		</div>
	);
};

const UsersList = () => {
	const { allUsers, user } = useAuth();
	return (
		<div className="space-y-1">
			{allUsers.map(u => (
				<div key={u} className={cn(
					"text-sm px-2 py-1 rounded flex items-center gap-2",
					u === user ? "bg-ubuntu-orange/10 text-ubuntu-orange font-medium" : "text-gray-600"
				)}>
					<div className={cn("w-1.5 h-1.5 rounded-full", u === user ? "bg-ubuntu-orange" : "bg-gray-400")} />
					{u}
				</div>
			))}
		</div>
	);
};

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
	const [nickname, setNickname] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { login } = useAuth();

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		const result = await login(nickname, password);
		if (result.success) {
			onSuccess();
			onClose();
		} else {
			setError(result.error || 'Ошибка');
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div className="gnome-window w-full max-w-md animate-in zoom-in duration-200">
				<div className="gnome-header">
					<div className="w-12" />
					<span className="font-bold text-gray-600">Вход в систему обучения</span>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
				</div>
				<div className="p-8 bg-white">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-bold text-gray-500 uppercase mb-1">Аккаунт</label>
							<input
								type="text"
								value={nickname}
								onChange={(e) => setNickname(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ubuntu-orange outline-none"
								placeholder="Только буквы, без цифр в начале"
								required
							/>
						</div>
						<div>
							<label className="block text-xs font-bold text-gray-500 uppercase mb-1">Пароль</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ubuntu-orange outline-none"
								required
							/>
						</div>
						{error && (
							<div className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded border border-red-100">
								{error === 'Неверный пароль' ? 'Неверный пароль. Попробуйте другой никнейм или пароль.' : error}
							</div>
						)}
						<button
							type="submit"
							className="w-full bg-ubuntu-orange text-white font-bold py-2 rounded-md hover:bg-[#ff632d] transition-colors shadow-md"
						>
							Войти / Начать
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export const TopBar: React.FC = () => {
	const { user } = useAuth();
	const [isAuthOpen, setIsAuthOpen] = useState(false);

	return (
		<>
			<div className="gnome-top-bar">
				<div className="flex items-center gap-1 h-full">
					<Link href="/" className="hover:bg-white/10 px-3 py-1 rounded cursor-default transition-colors flex items-center gap-2">
						<span className="font-bold">Главная</span>
					</Link>
					{user ? (
						<Link href="/knowledgeJourney" className="hover:bg-white/10 px-3 py-1 rounded cursor-default transition-colors flex items-center gap-2">
							<span className="font-medium opacity-90">Маршрут обучения</span>
						</Link>
					) : (
						<button onClick={() => setIsAuthOpen(true)} className="hover:bg-white/10 px-3 py-1 rounded cursor-default transition-colors flex items-center gap-2">
							<span className="font-medium opacity-90">Маршрут обучения</span>
						</button>
					)}
				</div>
				<div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
					<span className="text-xs font-bold">8 мая 15:40</span>
				</div>
				<div className="flex-grow" />
				<div className="flex items-center gap-4">
					{user && (
						<div className="flex items-center gap-2 px-2 py-0.5 bg-white/10 rounded text-xs">
							<ShieldCheck size={12} className="text-green-400" />
							<span>{user}</span>
						</div>
					)}
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
			<AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={() => window.location.href = '/knowledgeJourney'} />
		</>
	);
};
