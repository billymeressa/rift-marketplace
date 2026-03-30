import React from 'react';
import { render } from '@testing-library/react-native';
import OrderStatusBadge from '../../components/OrderStatusBadge';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Return the key so we can assert on translation keys
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const ALL_STATUSES = [
  'proposed',
  'countered',
  'accepted',
  'rejected',
  'payment_pending',
  'payment_held',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
];

describe('OrderStatusBadge — rendering', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<OrderStatusBadge status="proposed" />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the translation key as the label', () => {
    const { getByText } = render(<OrderStatusBadge status="proposed" />);
    getByText('order.statusProposed');
  });

  it('falls back to the raw status string for unknown statuses', () => {
    const { getByText } = render(<OrderStatusBadge status="unknown_state" />);
    getByText('unknown_state');
  });

  it.each(ALL_STATUSES)('renders correctly for status "%s"', (status) => {
    const { toJSON } = render(<OrderStatusBadge status={status} />);
    expect(toJSON()).not.toBeNull();
  });
});

describe('OrderStatusBadge — badge colors', () => {
  it('uses blue for "proposed"', () => {
    const { toJSON } = render(<OrderStatusBadge status="proposed" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#2196F3');
  });

  it('uses green for "accepted"', () => {
    const { toJSON } = render(<OrderStatusBadge status="accepted" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#4CAF50');
  });

  it('uses red for "rejected"', () => {
    const { toJSON } = render(<OrderStatusBadge status="rejected" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#F44336');
  });

  it('uses dark green for "completed"', () => {
    const { toJSON } = render(<OrderStatusBadge status="completed" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#1B4332');
  });

  it('uses grey fallback for unrecognised status', () => {
    const { toJSON } = render(<OrderStatusBadge status="mystery" />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#9E9E9E');
  });
});
