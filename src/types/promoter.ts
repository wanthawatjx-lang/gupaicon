export interface Promoter {
  id: string;
  name: string;
  igUrl?: string;
  verified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type PromoterFormData = {
  name: string;
  igUrl?: string;
  verified: boolean;
};
