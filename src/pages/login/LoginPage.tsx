import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import logoUrl from '@/assets/logo/agc-logo-circular.png';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F2E4] flex items-center justify-center p-4 font-serif">
      <Card className="w-full max-w-md shadow-xl border-[#E7E2D7] bg-white">
        <CardHeader className="text-center pb-2">
          {/* Ornate Circular AGC Logo */}
          <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#C49A35] p-1 bg-black shadow-md mb-3 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Anjaneya Gold Company Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <CardTitle className="text-xl tracking-wide font-bold uppercase text-[#171717]">
            Anjaneya Gold Company
          </CardTitle>
          <CardDescription className="text-xs text-[#A98226] font-medium tracking-wider uppercase">
            Billing & Management System
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold">
                Username
              </Label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 text-xs"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 font-medium"
            >
              {isLoading ? 'Signing In...' : 'Sign In to System'}
            </Button>
          </form>

          <div className="mt-6 text-center text-[11px] text-gray-500 border-t border-[#E7E2D7] pt-3">
            <span>Offline-First Windows Desktop Architecture</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
