import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Shield,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  auth,
} from '../firebase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Akun admin baru berhasil didaftarkan!');
        setTimeout(() => {
          onLoginSuccess(userCredential.user.email || email);
          onClose();
        }, 800);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Berhasil masuk sebagai admin!');
        setTimeout(() => {
          onLoginSuccess(userCredential.user.email || email);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Gagal masuk. Periksa email dan password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Email atau password salah. Coba gunakan tombol "Login Cepat Demo" di bawah.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Email sudah terdaftar. Silakan pilih tab "Masuk" dan masukkan password Anda.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password minimal 6 karakter.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    const demoEmail = 'admin@videostream.local';
    const demoPassword = 'AdminPassword123!';

    try {
      // Try login first
      const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      setSuccessMsg('Berhasil masuk dengan akun Demo Admin!');
      setTimeout(() => {
        onLoginSuccess(cred.user.email || demoEmail);
        onClose();
      }, 500);
    } catch (loginErr: any) {
      // If user doesn't exist yet, auto register
      if (
        loginErr.code === 'auth/user-not-found' ||
        loginErr.code === 'auth/invalid-credential'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          setSuccessMsg('Akun Demo Admin berhasil diinisialisasi!');
          setTimeout(() => {
            onLoginSuccess(cred.user.email || demoEmail);
            onClose();
          }, 500);
          return;
        } catch (regErr: any) {
          setErrorMsg(regErr.message || 'Gagal mendaftarkan demo admin.');
        }
      } else {
        setErrorMsg(loginErr.message || 'Gagal masuk demo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="admin-login-modal"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isRegister ? 'Daftar Akun Admin' : 'Login Khusus Admin'}
                </h3>
                <p className="text-xs text-slate-400">Akses upload &amp; kelola video</p>
              </div>
            </div>
            <button
              id="btn-close-login-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clarity Notice for Public Users */}
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              <strong>Info Penonton:</strong> User biasa <u>tidak perlu login</u>. Siapa pun bisa
              langsung menonton video tanpa akun. Login ini hanya untuk Admin pengunggah video.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Login Option */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Coba Langsung (Instan)
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                1-Klik
              </span>
            </div>
            <button
              id="btn-quick-demo-admin"
              type="button"
              disabled={isLoading}
              onClick={handleQuickDemoLogin}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {isLoading ? 'Menghubungkan...' : 'Masuk Cepat sebagai Demo Admin'}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
              atau gunakan email admin
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-admin-email"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-admin-auth"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : isRegister ? (
                'Daftarkan Akun Admin'
              ) : (
                'Masuk ke Akun Admin'
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="pt-2 text-center">
            <button
              id="btn-toggle-auth-mode"
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isRegister
                ? 'Sudah punya akun admin? Klik di sini untuk Masuk'
                : 'Belum punya akun admin? Klik untuk Mendaftar baru'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
