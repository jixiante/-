export type MessageRole = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  type?: 'text' | 'membership' | 'case' | 'options' | 'file' | 'contract';
  options?: string[];
  suggestions?: string[];
  timestamp?: string;
  isPremium?: boolean;
  caseData?: {
    image: string;
    title: string;
    description: string;
  };
  file?: {
    name: string;
    type: string;
    data: string;
  };
}

export interface MembershipBenefit {
  icon: string;
  title: string;
  description: string;
}
