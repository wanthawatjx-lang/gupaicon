export type OrganizerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OrganizerRequest {
  id: string; // equals user uid
  promoterName: string;
  igUrl: string;
  contactEmail: string;
  note: string;
  status: OrganizerRequestStatus;
  createdAt: any;
}

export interface OrganizerRecord {
  uid: string; // document id
  promoterId: string;
  email: string;
  approvedAt: any;
}

export type OrganizerRequestFormData = {
  promoterName: string;
  igUrl: string;
  contactEmail: string;
  note: string;
};
