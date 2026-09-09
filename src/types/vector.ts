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
