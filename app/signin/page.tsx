'use client';

import { Suspense, useEffect, useState } from 'react';
import { Link, useNav, useQuery } from '@/components/nav';
import { ArrowRight, Lock, User } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { SkyShapes } from '@/components/sky-shapes';
import { signIn, useSession } from '@/lib/auth';

function SignInForm() {
  const router = useNav();
  const params = useQuery();
  const { ready, session } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const next = params.get('next') ?? '/dashboard';

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (ready && session) router.replace(next);
  }, [ready, session, next, router]);

  return (
    <form
      className="signin-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (signIn(username, password)) {
          router.push(next);
        } else {
          setError('That username and password don’t match the pilot account.');
        }
      }}
    >
      <label>
        Username
        <span className="field">
          <User size={16} />
          <input
            required
            autoComplete="username"
            placeholder="Your username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError('');
            }}
          />
        </span>
      </label>
      <label>
        Password
        <span className="field">
          <Lock size={16} />
          <input
            required
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
          />
        </span>
      </label>
      {error && (
        <p className="signin-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit">
        Sign in <ArrowRight size={17} />
      </button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <main className="signin-page">
      <SkyShapes />
      <section className="signin-card">
        <div className="signin-brand">
          <Link href="/" aria-label="AdBite home">
            <Wordmark className="signin-word" />
          </Link>
          <h1>Book a week of local screen time.</h1>
          <p>
            Sign in to set a spend, pick the neighborhoods you want to show up in, and see your ad
            on the screens before it runs.
          </p>
          <ul>
            <li>Set your spend by the minute</li>
            <li>Choose venues, audience, and area</li>
            <li>Preview your creative on real boards</li>
          </ul>
        </div>
        <div className="signin-panel">
          <h2>Advertiser sign in</h2>
          <Suspense fallback={<p className="signin-loading">Loading…</p>}>
            <SignInForm />
          </Suspense>
          <p className="signin-foot">
            Running a shop instead? <Link href="/#join">Join the shop waitlist</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
