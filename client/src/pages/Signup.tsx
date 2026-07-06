import { BookOpen } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import logo from '../logo/logo.png';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.register({ name, email, password });
      login(response.user);
      const redirectTo = sessionStorage.getItem('redirect_after_login');
      if (redirectTo) {
        sessionStorage.removeItem('redirect_after_login');
        navigate(redirectTo);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center">
      <div className="bg-surface border border-divider rounded-xl p-8 max-w-md w-full shadow-lg">
        <div className="flex flex-col items-center mb-4">
          <div className="flex justify-center -mb-8 relative z-0">
            <img src={logo} alt="Nilansu Logo" className="h-48 w-auto object-contain scale-110" />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary relative z-10">Create Account</h1>
          <p className="text-textSecondary text-sm mt-1">Join Nilansu Publication</p>
        </div>

        <div className="min-h-[40px] mb-4">
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm border border-danger/20 animate-fade-in">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
            <input
              type="text"
              required
              className="input-field w-full"
              placeholder="Amit Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
            <input
              type="email"
              required
              className="input-field w-full"
              placeholder="abc@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
            <input
              type="password"
              required
              className="input-field w-full"
              placeholder="••••••••"
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-textSecondary mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
