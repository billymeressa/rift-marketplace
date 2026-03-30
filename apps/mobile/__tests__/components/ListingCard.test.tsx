import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ListingCard from '../../components/ListingCard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../lib/options', () => ({
  REGION_LABELS: { oromia: { en: 'Oromia', am: 'ኦሮሚያ', om: 'Oromiyaa' } },
  PRODUCT_LABELS: {},
  CONDITION_LABELS: {},
  buildListingTitle: (_listing: any) => 'Washed Coffee',
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseListing = {
  id: 'listing-001',
  type: 'sell',
  productCategory: 'coffee',
  region: 'oromia',
  quantity: '500',
  unit: 'kg',
  price: '45.50',
  currency: 'USD',
  createdAt: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
  images: [],
  sellerVerified: false,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => mockPush.mockClear());

describe('ListingCard — rendering', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ListingCard listing={baseListing} />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows FOR SALE badge for sell listings', () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    getByText('FOR SALE');
  });

  it('shows WANTED badge for buy listings', () => {
    const { getByText } = render(<ListingCard listing={{ ...baseListing, type: 'buy' }} />);
    getByText('WANTED');
  });

  it('shows the listing title from buildListingTitle', () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    getByText('Washed Coffee');
  });

  it('shows the formatted USD price', () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    // price formatted with $ prefix; toLocaleString may vary, check it starts with $
    expect(getByText(/\$45/).props.children).toBeTruthy();
  });

  it('shows "Request Quote" when price is not set', () => {
    const { getByText } = render(<ListingCard listing={{ ...baseListing, price: null }} />);
    getByText('Request Quote');
  });

  it('shows Verified Exporter badge when sellerVerified is true', () => {
    const { getByText } = render(
      <ListingCard listing={{ ...baseListing, sellerVerified: true }} />,
    );
    getByText('Verified Exporter');
  });

  it('does NOT show Verified Exporter badge when sellerVerified is false', () => {
    const { queryByText } = render(<ListingCard listing={baseListing} />);
    expect(queryByText('Verified Exporter')).toBeNull();
  });

  it('does NOT show the Remove button when onDelete is not provided', () => {
    const { queryByText } = render(<ListingCard listing={baseListing} />);
    expect(queryByText('Remove')).toBeNull();
  });

  it('shows the Remove button when onDelete is provided', () => {
    const { getByText } = render(
      <ListingCard listing={baseListing} onDelete={() => {}} />,
    );
    getByText('Remove');
  });

  it('shows the region in the spec line', () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    getByText(/Oromia/);
  });
});

describe('ListingCard — interactions', () => {
  it('navigates to the listing detail page on press', () => {
    const { getByText } = render(<ListingCard listing={baseListing} />);
    fireEvent.press(getByText('Washed Coffee'));
    expect(mockPush).toHaveBeenCalledWith('/listing/listing-001');
  });

  it('calls onDelete when the Remove button is pressed', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <ListingCard listing={baseListing} onDelete={onDelete} />,
    );
    fireEvent.press(getByText('Remove'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation when Remove is pressed', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <ListingCard listing={baseListing} onDelete={onDelete} />,
    );
    fireEvent.press(getByText('Remove'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('ListingCard — time display', () => {
  it('shows minutes for recent listings', () => {
    const listing = { ...baseListing, createdAt: new Date(Date.now() - 5 * 60_000).toISOString() };
    const { getByText } = render(<ListingCard listing={listing} />);
    getByText('5m');
  });

  it('shows hours for listings posted a few hours ago', () => {
    const listing = { ...baseListing, createdAt: new Date(Date.now() - 3 * 3600_000).toISOString() };
    const { getByText } = render(<ListingCard listing={listing} />);
    getByText('3h');
  });

  it('shows days for listings posted a few days ago', () => {
    const listing = { ...baseListing, createdAt: new Date(Date.now() - 3 * 86400_000).toISOString() };
    const { getByText } = render(<ListingCard listing={listing} />);
    getByText('3d');
  });
});
