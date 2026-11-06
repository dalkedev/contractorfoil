import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('opens sign-in when a signed-out visitor loads a nested contractor route', async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/contractors/company-1');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});
