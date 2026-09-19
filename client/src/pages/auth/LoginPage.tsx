import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/account';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Login failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-content">Log in</h1>
      <p className="mt-1 text-sm text-content-muted">Access your orders and account settings.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" isLoading={loading}>
          Continue
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-content-muted">
        <Link to="/forgot-password" className="text-primary-600 hover:underline">
          Forgot password?
        </Link>
        {' · '}
        <Link to="/register" className="text-primary-600 hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
