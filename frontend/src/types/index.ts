export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type NodeKind = 'fact' | 'hypothesis' | 'unknown' | 'goal' | 'option';

export interface ReportedFact {
  id: string;
  text: string;
  source: 'user';
}

export interface Hypothesis {
  id: string;
  text: string;
  source: 'ai';
  status: 'active' | 'corrected' | 'dismissed';
  confidence: 'tentative' | 'moderate' | 'high';
  user_note?: string;
}

export interface Unknown {
  id: string;
  text: string;
}

export interface Goal {
  id: string;
  text: string;
  source: 'user' | 'inferred';
}

export interface FollowUpQuestion {
  text: string;
  purpose: string;
}

export interface PossibleResponse {
  id: string;
  action: string;
  benefits: string[];
  risks: string[];
  appropriate_when: string;
}

export interface StateConnection {
  source: string;
  target: string;
  label?: string;
}

export interface StructuredReflectionState {
  encounter: {
    description: string;
  };
  reported_facts: ReportedFact[];
  hypotheses: Hypothesis[];
  unknowns: Unknown[];
  goals: Goal[];
  follow_up_question?: FollowUpQuestion;
  possible_responses: PossibleResponse[];
  connections: StateConnection[];
}

export interface ReflectionSession {
  id: string;
  initial_situation: string;
  status: 'in_progress' | 'completed';
  is_saved: boolean;
  selected_response_id?: string;
  title?: string;
  state: StructuredReflectionState;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SessionSummary {
  id: string;
  title?: string;
  initial_situation: string;
  status: string;
  is_saved: boolean;
  selected_response_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
