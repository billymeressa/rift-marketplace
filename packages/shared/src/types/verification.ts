export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type BusinessType = 'exporter' | 'cooperative' | 'trader' | 'farmer';

export interface SellerVerification {
  id: string;
  userId: string;
  businessName?: string;
  businessType?: BusinessType;
  tradeLicenseRef?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface SubmitVerificationInput {
  businessName: string;
  businessType: BusinessType;
  tradeLicenseRef?: string;
}
