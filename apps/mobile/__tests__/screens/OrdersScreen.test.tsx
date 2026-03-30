import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OrdersScreen from '../../app/(tabs)/orders';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../lib/auth', () => ({
  useAuth: () => ({ user: { id: 'user-001', name: 'Test User' } }),
}));

jest.mock('../../components/ResponsiveContainer', () => {
  const { View } = require('react-native');
  return ({ children, style }: any) => <View style={style}>{children}</View>;
});

const mockRefetch = jest.fn();
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupQuery(overrides = {}) {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isRefetching: false,
    refetch: mockRefetch,
    ...overrides,
  });
}

const sampleOrders = [
  {
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
  },
  {
    id: 'order-002',
    status: 'accepted',
    quantity: '200',
    unit: 'kg',
    totalPrice: 9000,
    currency: 'ETB',
    createdAt: '2026-03-16T10:00:00.000Z',
    listing: { title: 'Washed Coffee' },
    buyer: { name: 'Chaltu Tola' },
    seller: null,
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseQuery.mockReset();
  mockRefetch.mockReset();
});

describe('OrdersScreen — rendering', () => {
  it('renders without crashing', () => {
    setupQuery();
    const { toJSON } = render(<OrdersScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows both role tabs', () => {
    setupQuery();
    const { getByText } = render(<OrdersScreen />);
    getByText('order.asBuyer');
    getByText('order.asSeller');
  });

  it('shows a loading spinner while data is loading', () => {
    setupQuery({ isLoading: true });
    const { getByTestId, UNSAFE_queryByType } = render(<OrdersScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryByType(ActivityIndicator)).not.toBeNull();
  });

  it('shows the empty state when there are no orders', () => {
    setupQuery({ data: { orders: [], hasMore: false } });
    const { getByText } = render(<OrdersScreen />);
    getByText('order.noOrders');
  });

  it('renders order cards when orders exist', () => {
    setupQuery({ data: { orders: sampleOrders, hasMore: false } });
    const { getByText } = render(<OrdersScreen />);
    getByText('Sesame Seeds');
    getByText('Washed Coffee');
  });

  it('shows Load More button when hasMore is true', () => {
    setupQuery({ data: { orders: sampleOrders, hasMore: true } });
    const { getByText } = render(<OrdersScreen />);
    getByText('common.loadMore');
  });

  it('hides Load More button when hasMore is false', () => {
    setupQuery({ data: { orders: sampleOrders, hasMore: false } });
    const { queryByText } = render(<OrdersScreen />);
    expect(queryByText('common.loadMore')).toBeNull();
  });
});

describe('OrdersScreen — tab interactions', () => {
  it('"As Buyer" tab is active by default', () => {
    setupQuery();
    const { getByText } = render(<OrdersScreen />);
    const buyerTab = getByText('order.asBuyer');
    // Initial query should have been called with role: 'buyer'
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['buyer']),
      }),
    );
    expect(buyerTab).toBeTruthy();
  });

  it('switching to "As Seller" tab changes the query role', async () => {
    setupQuery();
    const { getByText } = render(<OrdersScreen />);

    fireEvent.press(getByText('order.asSeller'));

    await waitFor(() => {
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['seller']),
        }),
      );
    });
  });

  it('switching back to "As Buyer" restores the buyer query', async () => {
    setupQuery();
    const { getByText } = render(<OrdersScreen />);

    fireEvent.press(getByText('order.asSeller'));
    fireEvent.press(getByText('order.asBuyer'));

    await waitFor(() => {
      const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
      expect(lastCall.queryKey).toContain('buyer');
    });
  });
});

describe('OrdersScreen — pagination', () => {
  it('increments page when "Load More" is pressed', async () => {
    setupQuery({ data: { orders: sampleOrders, hasMore: true } });
    const { getByText } = render(<OrdersScreen />);

    fireEvent.press(getByText('common.loadMore'));

    await waitFor(() => {
      const calls = mockUseQuery.mock.calls;
      const lastQueryKey = calls[calls.length - 1][0].queryKey;
      expect(lastQueryKey).toContain(2); // page 2
    });
  });
});
