import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

test('shows ten grouped questions in the questionnaire', () => {
  jest.useFakeTimers();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Zum Fragebogen' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('max', '10');

  const topics = [
    'Frieden',
    'Sicherheit',
    'Migration',
    'Bürgergeld/Wohnen',
    'Arbeit',
    'Rente & Pflege',
    'Kinder & Bildung',
    'Sport & Kultur',
    'Haushalt & Klima',
    'Steuern',
  ];

  topics.forEach((topic, index) => {
    expect(screen.getByRole('heading', { name: `${topic}:` })).toBeInTheDocument();
    if (index < topics.length - 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Antwort 5 von 10' }));
      act(() => jest.advanceTimersByTime(300));
    }
  });

  jest.useRealTimers();
});

test('opens and leaves the information pages through the URL hash', async () => {
  window.history.replaceState({}, '', '/#datenschutz');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Datenschutz' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Zurück zur Wahlspinne' }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Willkommen bei der Wahlspinne!' })).toBeInTheDocument();
  });
});
