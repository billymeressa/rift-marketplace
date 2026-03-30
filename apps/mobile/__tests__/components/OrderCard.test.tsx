import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OrderCard from '../../components/OrderCard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseOrder = {
  id: 'order-001',
  status: 'proposed',
  quantity: '100',
  unit: 'kg',
  totalPrice: 4500,
  currency: 'ETB',
  createdAt: '2026-03-15T10:00:00.000Z',
  listing: { title: 'Sesame Seeds' },
  buyer: { name: 'Abebe Kebede' },
  seller: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => mockPush.mockClear());

describe('OrderCard — rendering', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<OrderCard order={baseOrder} />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows the listing title', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    getByText('Sesame Seeds');
  });

  it('shows the buyer name as the counterparty', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    getByText('Abebe Kebede');
  });

  it('shows the seller name when buyer is null', () => {
    const order = { ...baseOrder, buyer: null, seller: { name: 'Chaltu Tola' } };
    const { getByText } = render(<OrderCard order={order} />);
    getByText('Chaltu Tola');
  });

  it('shows quantity and unit', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    getByText(/100.*kg/);
  });

  it('shows total price in ETB format', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    getByText(/4,500.*ETB/);
  });

  it('shows total price with $ prefix for USD orders', () => {
    const order = { ...baseOrder, currency: 'USD', totalPrice: 250 };
    const { getByText } = render(<OrderCard order={order} />);
    getByText(/\$250/);
  });

  it('shows a formatted date', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    // Date should contain "Mar" and "2026"
    expect(getByText(/Mar.*2026|2026.*Mar/).props.children).toBeTruthy();
  });

  it('does not show a date when createdAt is missing', () => {
    const { queryByText } = render(
      <OrderCard order={{ ...baseOrder, createdAt: undefined }} />,
    );
    expect(queryByText(/Mar.*2026/)).toBeNull();
  });

  it('renders the status badge', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    // OrderStatusBadge renders the translation key since we mock t()
    getByText('order.statusProposed');
  });
});

describe('OrderCard — interactions', () => {
  it('navigates to order detail page on press', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    fireEvent.press(getByText('Sesame Seeds'));
    expect(mockPush).toHaveBeenCalledWith('/order/order-001');
  });

  it('calls push exactly once per tap', () => {
    const { getByText } = render(<OrderCard order={baseOrder} />);
    fireEvent.press(getByText('Sesame Seeds'));
    fireEvent.press(getByText('Sesame Seeds'));
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith('/order/order-001');
  });
});
