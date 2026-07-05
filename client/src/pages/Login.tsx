import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

export default function Login() {
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
      const response = await api.login({ email, password });
      login(response.user);
      
      const redirectTo = sessionStorage.getItem('redirect_after_login');
      sessionStorage.removeItem('redirect_after_login');
      
      if (response.user.role === 'ADMIN' && response.user.adminUrl) {
        navigate(response.user.adminUrl);
      } else if (redirectTo && redirectTo !== '/profile') {
        navigate(redirectTo);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center">
      <div className="bg-surface border border-divider rounded-xl p-8 max-w-md w-full shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-full text-primary mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary">Welcome Back</h1>
          <p className="text-textSecondary text-sm mt-1">Log in to your account</p>
        </div>

        <div className="min-h-[60px] mb-6">
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm border border-danger/20 animate-fade-in">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          
          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-textSecondary mt-6">
          Don't have an account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
