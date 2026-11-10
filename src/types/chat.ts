export type ChatStatus = 'pending' | 'accepted' | 'declined';

export interface Chat {
  id: string; // sorted uids joined with '_'
  members: [string, string];
  initiator: string;
  status: ChatStatus;
  createdAt: any;
  lastMessageAt: any;
  lastMessagePreview: string;
  names: Record<string, string>; // { [uid]: 'displayName#tag' }
  hiddenBy?: string[];
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: any;
}

export interface ChatRead {
  lastReadAt: any;
}
