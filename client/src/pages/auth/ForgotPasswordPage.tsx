import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/store/useToastStore';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Check your email', 'If an account exists, reset instructions were sent.');
    } catch (error) {
      toast.error('Request failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-content">Forgot password</h1>
      <p className="mt-1 text-sm text-content-muted">
        Enter your email and we’ll send a reset link if the account exists.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" isLoading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-content-muted">
        <Link to="/login" className="text-primary-600 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
