import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) =>
    React.createElement('a', { href: to, ...props }, children),
}));

function renderAuthShell(mode: 'login' | 'register') {
  return renderToStaticMarkup(
    <AuthSplitLayout
      mode={mode}
      formTitle={mode === 'login' ? 'Welcome back' : 'Create your workspace'}
      formDescription="Auth layout regression contract"
    >
      <form>
        <input aria-label="placeholder-input" />
      </form>
    </AuthSplitLayout>
  );
}

describe('Auth split layout regression guard', () => {
  it('keeps strict 50/50 desktop split with no inter-section gap class', () => {
    const html = renderAuthShell('login');

    expect(html).toContain('grid-cols-1 lg:grid-cols-2');

    const splitRootMatch = html.match(/<div class="([^"]*grid-cols-1 lg:grid-cols-2[^"]*)"/);
    expect(splitRootMatch?.[1]).toBeTruthy();
    expect(splitRootMatch?.[1]).not.toMatch(/\bgap-\S+/);
  });

  it('renders sign-in and sign-up switch links consistently', () => {
    const html = renderAuthShell('register');

    expect(html).toContain('>Sign In<');
    expect(html).toContain('>Sign Up<');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/register"');
  });

  it('matches stable shell structure snapshot', () => {
    const html = renderAuthShell('login');
    expect(html).toMatchSnapshot();
  });
});
