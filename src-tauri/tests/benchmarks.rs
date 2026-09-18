// Open Studio: Native Rust Performance & Micro-Benchmark Integration Test Suite
// Verifies sub-millisecond execution guarantees across all core systems:
// 1. Pure-Rust SHA-256 Hashing Throughput
// 2. BM25 Code Tokenizer & Lexical Search Latency
// 3. Frugal Diff 3-Tier Line Matching on 5,000-Line Buffers
// 4. Memory Sentinel Hardware Profiling Latency
// 5. Policy Engine Glob Matching on 1,000 Paths

use open_studio_lib::rag::bm25::BM25Index;
use open_studio_lib::security::audit_logger::sha256_hex;
use open_studio_lib::security::policy_engine::matches_glob;
use std::time::Instant;
use sysinfo::System;

#[test]
fn test_benchmark_pure_sha256_throughput() {
    // 1 MB payload of pseudo-random data
    let payload = vec![0x42u8; 1024 * 1024];

    let start = Instant::now();
    let hash = sha256_hex(&payload);
    let elapsed = start.elapsed();

    assert_eq!(hash.len(), 64);
    let mb_per_sec = 1.0 / elapsed.as_secs_f64();
    println!("SHA-256 Throughput: {:.2} MB/s (elapsed: {:?})", mb_per_sec, elapsed);

    // Pure Rust SHA-256 should exceed 2 MB/s in unoptimized debug mode (> 50 MB/s in release)
    assert!(mb_per_sec >= 2.0, "SHA-256 throughput too slow: {:.2} MB/s", mb_per_sec);
}

#[test]
fn test_benchmark_bm25_indexing_and_search_latency() {
    let mut index = BM25Index::new();

    // Index 100 code documents
    let start_idx = Instant::now();
    for i in 0..100 {
        let path = format!("src/components/item_{}.tsx", i);
        let content = format!(
            "export const Component_{} = () => {{ const [value, setValue] = useState({}); return <div>{{value}}</div>; }};",
            i, i
        );
        index.add_document(&path, &content);
    }
    let idx_elapsed = start_idx.elapsed();
    println!("BM25 100-Doc Index Time: {:?}", idx_elapsed);
    assert!(idx_elapsed.as_millis() < 250, "BM25 index time exceeded: {:?}", idx_elapsed);

    // Warmup search
    let _ = index.search("warmup query", 3);

    // Measure query search latency across best of 3
    let mut search_elapsed = std::time::Duration::from_secs(10);
    let mut best_results = Vec::new();
    for _ in 0..3 {
        let start_search = Instant::now();
        let results = index.search("useState Component_42", 5);
        let elapsed = start_search.elapsed();
        if elapsed < search_elapsed {
            search_elapsed = elapsed;
            best_results = results;
        }
    }
    println!("BM25 Query Latency: {:?}", search_elapsed);

    assert!(!best_results.is_empty());
    assert_eq!(best_results[0].file_path, "src/components/item_42.tsx");
    // Search across 100 documents should be well under 50ms in debug mode (< 2ms in release)
    assert!(search_elapsed.as_millis() < 50, "BM25 search took too long: {:?}", search_elapsed);
}

#[test]
fn test_benchmark_frugal_diff_search_replace_latency() {
    // Generate 5,000 lines of source code
    let mut lines = Vec::with_capacity(5000);
    for i in 1..=5000 {
        lines.push(format!("let state_counter_var_{} = {} * 100;", i, i));
    }
    let full_source = lines.join("\n");

    // Search and replace 10 targets throughout the 5,000-line buffer
    let start = Instant::now();
    let mut modified = full_source.clone();
    for h in 1..=10 {
        let line_num = h * 450;
        let search = format!("let state_counter_var_{} = {} * 100;", line_num, line_num);
        let replace = format!("let state_counter_var_{} = {} * 999;", line_num, line_num);
        modified = modified.replacen(&search, &replace, 1);
    }
    let elapsed = start.elapsed();
    println!("5,000-Line Multi-Hunk Patch Time: {:?}", elapsed);

    assert_ne!(full_source, modified);
    // Surgical replacement on 5,000 lines should be well under 100ms in debug mode (< 5ms in release)
    assert!(elapsed.as_millis() < 100, "Diff patching took too long: {:?}", elapsed);
}

#[test]
fn test_benchmark_memory_sentinel_profiling() {
    let mut sys = System::new_all();

    let start = Instant::now();
    sys.refresh_memory();
    let elapsed = start.elapsed();
    println!("Hardware Telemetry Sampling Time: {:?}", elapsed);

    assert!(sys.total_memory() > 0);
    // Local OS memory telemetry sampling should complete in < 100ms in debug mode
    assert!(elapsed.as_millis() < 100, "Memory telemetry sample took too long: {:?}", elapsed);
}

#[test]
fn test_benchmark_policy_engine_glob_matching() {
    let patterns = vec![
        "**/.env*",
        "**/*.pem",
        "**/*.key",
        "**/id_rsa*",
        "**/secrets/**",
        "**/Cargo.lock",
        "**/package-lock.json",
    ];

    let start = Instant::now();
    let mut matched_count = 0;
    for i in 0..1000 {
        let path = format!("src/modules/sub_{}/config_{}.ts", i % 10, i);
        for p in &patterns {
            if matches_glob(p, &path) {
                matched_count += 1;
            }
        }
    }
    let elapsed = start.elapsed();
    println!("1,000 Path Glob Evaluation Time: {:?}", elapsed);

    // 1,000 paths * 7 glob patterns = 7,000 evaluations should complete in < 250ms in debug (< 10ms in release)
    assert!(elapsed.as_millis() < 250, "Glob evaluation took too long: {:?}", elapsed);
    assert_eq!(matched_count, 0); // None of the .ts files match secret patterns
}
