import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await register({ name, email, password });
      toast.success('Account created');
      navigate('/account', { replace: true });
    } catch (error) {
      toast.error('Registration failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-content">Create account</h1>
      <p className="mt-1 text-sm text-content-muted">Start shopping with a secure customer account.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
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
          autoComplete="new-password"
          hint="8+ chars with upper, lower, number, and special character"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" isLoading={loading}>
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-content-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
