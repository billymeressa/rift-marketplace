export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: { id: string; name: string };
}

export interface CreateReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface TrustScore {
  overallScore: number;
  isVerified: boolean;
  completedOrders: number;
  averageRating: number | null;
  totalReviews: number;
  memberSinceDays: number;
}
