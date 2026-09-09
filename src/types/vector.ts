export interface CodeChunk {
  chunk_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
  token_count: number;
}

export interface EmbeddedChunk {
  chunk: CodeChunk;
  embedding: number[];
}

export interface VectorSearchResult {
  chunk: CodeChunk;
  similarity: number;
}

export interface VectorIndexSummary {
  total_chunks: number;
  total_files: number;
  vector_dimension: number;
  duration_ms: number;
}

export interface VectorStoreStatus {
  is_indexed: boolean;
  total_chunks: number;
  indexed_files_count: number;
  last_updated_ms: number;
}

export interface VectorSearchOptions {
  limit?: number;
  minScore?: number;
}
