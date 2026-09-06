export interface ModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
}

export interface InferenceHealth {
  online: boolean;
  endpoint: string;
  models: ModelInfo[];
  error?: string;
}

export interface CompletionRequest {
  model: string;
  prompt: string;
  temperature?: number;
  stop_tokens?: string[];
  keep_alive?: string;
}

export interface LlmTokenPayload {
  request_id: string;
  token: string;
  done: boolean;
}

export interface LlmDonePayload {
  request_id: string;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
