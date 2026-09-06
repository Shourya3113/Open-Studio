import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, letter[1] - 30, "OPEN STUDIO — 28-DAY AGENTIC EXECUTION BLUEPRINT")
            self.drawRightString(letter[0] - 40, letter[1] - 30, "FOR ANTIGRAVITY ONE-SHOT IMPLEMENTATION")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, letter[1] - 34, letter[0] - 40, letter[1] - 34)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.drawString(40, 25, "Confidential • Commercial Open Source Software (COSS) Blueprint v2.0")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 40, 25, page_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 35, letter[0] - 40, 35)

        self.restoreState()

def create_blueprint_pdf(output_filename="Open_Studio_Daily_Execution_Plan.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0F172A")    # Deep Slate
    c_blue = colors.HexColor("#2563EB")       # Electric Blue
    c_teal = colors.HexColor("#0D9488")       # Teal Accent
    c_dark_code = colors.HexColor("#1E293B")  # Dark code background
    c_border = colors.HexColor("#E2E8F0")     # Light border
    c_text = colors.HexColor("#1E293B")       # Dark charcoal
    c_muted = colors.HexColor("#475569")      # Muted slate

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_blue,
        spaceAfter=10
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_muted
    )

    h1_style = ParagraphStyle(
        'WeekHeading',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.white,
        spaceAfter=0
    )

    h2_style = ParagraphStyle(
        'DayHeading',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=c_primary,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=c_text,
        spaceAfter=4
    )

    bold_label = ParagraphStyle(
        'BoldLabel',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=c_primary
    )

    prompt_style = ParagraphStyle(
        'PromptStyle',
        fontName='Courier',
        fontSize=7.8,
        leading=10,
        textColor=colors.HexColor("#1E1B4B")
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        fontName='Courier',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor("#38BDF8")
    )

    story = []

    # Title Banner
    story.append(Paragraph("OPEN STUDIO: 28-DAY AGENTIC EXECUTION BLUEPRINT", title_style))
    story.append(Paragraph("Machine-Actionable Daily Engineering Plan for Antigravity One-Shot Execution", subtitle_style))
    story.append(Spacer(1, 4))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Target Stack:</b> Tauri v2 (Rust) + React 18 (TS) + Monaco", meta_style),
            Paragraph("<b>Hardware Acceleration:</b> Universal (NVIDIA CUDA, AMD ROCm, Apple Metal, Intel Arc & CPU)", meta_style),
        ],
        [
            Paragraph("<b>Inference:</b> Ollama (SSE) + llama.cpp + MLX", meta_style),
            Paragraph("<b>Latency Targets:</b> &lt; 40ms Tab Ghost-Text • &lt; 2s Frugal In-line Diffs", meta_style),
        ],
        [
            Paragraph("<b>Security:</b> 100% Air-Gapped Zero-Telemetry CI Verified", meta_style),
            Paragraph("<b>Cadence:</b> 4 Weeks • 28 Daily Atomic Milestones for Agent Prompting", meta_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Architecture Overview Box
    arch_ascii = """+---------------------------------------------------------------------------------------------------+
| Open Studio Desktop Shell: Tauri v2 (Rust Backend + React UI) | ~15MB binary, ~35MB RAM footprint |
+--------------------------+---------------------------+--------------------------+-----------------+
| Editor Core              | File System Tree          | Embedded Terminal        | Diff Review     |
| Monaco Editor            | Notify Watcher + SQLite   | portable-pty + xterm.js  | Multi-File Hunk |
+--------------------------+---------------------------+--------------------------+-----------------+
| Language Intelligence    | Rust LSP Client (JSON-RPC) -> rust-analyzer, pyright, tsserver, gopls |
+--------------------------+------------------------------------------------------------------------+
| Codebase Context Index   | Tree-sitter AST Slicer (800 tok) + nomic-embed-text + SQLite-vec + BM25|
+--------------------------+------------------------------------------------------------------------+
| Dynamic Agent Core       | Dynamic Model Router (keep_alive VRAM manager) + Shadow Git Checkpoints|
+--------------------------+------------------------------------------------------------------------+
| Local Inference Gateway  | Ollama API (SSE) + llama.cpp server + MLX Metal (Apple Silicon)        |
+--------------------------+------------------------------------------------------------------------+"""
    
    arch_table = Table([[Preformatted(arch_ascii, ParagraphStyle('Ascii', fontName='Courier', fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A")))]], colWidths=[540])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 14))

    # DAYS DATA
    days_data = [
        # WEEK 1
        {
            "week": 1,
            "week_title": "WEEK 1: FOUNDATIONAL CORE & EDITOR INFRASTRUCTURE",
            "days": [
                {
                    "day": 1,
                    "title": "Project Scaffolding & Tauri v2 Shell",
                    "goal": "Setup production Tauri v2 workspace with Rust core, Vite + React + TS, Tailwind CSS in air-gapped dark aesthetic.",
                    "deliverables": "src-tauri/Cargo.toml (Tauri 2.x, tokio, serde), tauri.conf.json (offline CSP), AppSystemInfo IPC bridge.",
                    "contract": "get_system_info() -> Result<AppSystemInfo, String> returning OS, arch, total RAM.",
                    "prompt": "Scaffold Tauri v2 + React 18 + TS + Tailwind. Implement get_system_info IPC command. Configure strict offline CSP. Verify cargo check & npm run build.",
                    "test": "cd src-tauri && cargo check && npm run build"
                },
                {
                    "day": 2,
                    "title": "Monaco Editor Core & Layout Engine",
                    "goal": "Integrate Monaco Editor with multi-tab switching, split views (H/V), dirty tracking, and local worker bundling.",
                    "deliverables": "MonacoEditor.tsx (open-studio-dark theme), editorStore.ts (Zustand), TabBar.tsx, split pane CSS container.",
                    "contract": "interface EditorBuffer { id: string; filePath: string; content: string; isDirty: boolean; }",
                    "prompt": "Bundle Monaco locally without CDNs. Implement Zustand editorStore for open buffers, tabs, and split panes. Wire Ctrl+S, Ctrl+W, Ctrl+\\.",
                    "test": "npm run test -- -t 'editorStore' && npm run build"
                },
                {
                    "day": 3,
                    "title": "Native File Explorer & Virtual Workspace Tree",
                    "goal": "Build native file watcher and recursive folder tree capable of 50,000+ files without UI lag.",
                    "deliverables": "src-tauri/src/fs/ (notify-debouncer-mini, walkdir), FileTree.tsx (virtualized list, git status badges).",
                    "contract": "read_workspace_tree(root: String, depth: usize) -> Result<FileNode, String>; emits 'workspace-fs-change'.",
                    "prompt": "Implement read_workspace_tree respecting .gitignore. Stream fs-change events via notify. Render virtualized tree linking to editorStore.",
                    "test": "cd src-tauri && cargo test fs_tree && npm run test -- -t 'FileTree'"
                },
                {
                    "day": 4,
                    "title": "Embedded Terminal Infrastructure (Rust PTY + xterm.js)",
                    "goal": "Embed native cross-platform PTY terminal supporting PowerShell/cmd and bash/zsh with ANSI color streams.",
                    "deliverables": "src-tauri/src/terminal/ (portable-pty), TerminalPanel.tsx (xterm.js + fit addon).",
                    "contract": "spawn_terminal_session(id: String, shell: Option<String>), write_terminal_input(id, data), resize_terminal(id, cols, rows).",
                    "prompt": "Build PTY backend with portable-pty crate. Stream terminal bytes to frontend xterm.js. Wire resize handler and input dispatch.",
                    "test": "cd src-tauri && cargo test terminal_pty && npm run build"
                },
                {
                    "day": 5,
                    "title": "Local Inference Gateway & Streaming SSE Client",
                    "goal": "Build multi-backend async HTTP streaming client for Ollama, llama.cpp, and OpenAI endpoints with abort control.",
                    "deliverables": "src-tauri/src/inference/ (reqwest SSE client), stream_completion command emitting 'llm-chunk', abort_completion.",
                    "contract": "stream_completion(window, request_id, req: CompletionRequest) -> Result<(), String> with keep_alive support.",
                    "prompt": "Implement Ollama streaming SSE gateway using reqwest. Emit chunk events keyed by request_id. Implement cancellation via oneshot channels.",
                    "test": "cd src-tauri && cargo test inference_gateway"
                },
                {
                    "day": 6,
                    "title": "Inline Ghost-Text Autocomplete Engine",
                    "goal": "Build sub-40ms inline Tab autocompletion inside Monaco powered by resident Qwen2.5-Coder-1.5B.",
                    "deliverables": "inlineProvider.ts (Monaco InlineCompletionsProvider), FIM prompt formatter, 30ms keystroke debouncer.",
                    "contract": "formatFIMPrompt(prefix, suffix) -> '<|fim_prefix|>...<|fim_suffix|>...<|fim_middle|>'; Tab accepts.",
                    "prompt": "Implement Monaco InlineCompletionsProvider. Extract cursor context, format Qwen FIM prompt, debounce 30ms, query Ollama (keep_alive: -1).",
                    "test": "npm run test -- -t 'inlineProvider'"
                },
                {
                    "day": 7,
                    "title": "Week 1 Integration & Latency Benchmarks",
                    "goal": "Unify editor, tree, terminal, and autocomplete; verify < 40ms TTFT and < 50MB shell RAM usage.",
                    "deliverables": "src/App.tsx cohesive layout, bench/ttft.py benchmark harness, milestone tag v0.1.0-week1.",
                    "contract": "bench/ttft.py asserts average TTFT < 40ms across 50 requests; memory profiler verifies < 50MB idle.",
                    "prompt": "Perform Week 1 integration pass. Connect FileTree, Monaco, Terminal, and Autocomplete. Run bench/ttft.py and verify sub-40ms latency.",
                    "test": "npm run build && cd src-tauri && cargo check --release && python bench/ttft.py"
                }
            ]
        },
        # WEEK 2
        {
            "week": 2,
            "week_title": "WEEK 2: TOKEN OPTIMIZER & IN-LINE DIFF ENGINE",
            "days": [
                {
                    "day": 8,
                    "title": "Frugal Search/Replace Diff Protocol & Parser",
                    "goal": "Build deterministic diff parser saving 98% output tokens by generating only changed lines.",
                    "deliverables": "src-tauri/src/diff/frugal_parser.rs (regex + state machine parser), multi-hunk validator, apply_frugal_diff command.",
                    "contract": "parse_frugal_diff(output: &str) -> Result<Vec<DiffHunk>, String>; apply_hunk_to_content(content, hunk).",
                    "prompt": "Implement strict <<<< SEARCH / ======= / >>>>>> REPLACE diff parser in Rust. Support indentation-insensitive fallback and multi-hunk safety.",
                    "test": "cd src-tauri && cargo test diff::frugal_parser"
                },
                {
                    "day": 9,
                    "title": "Multi-File Diff Review UI",
                    "goal": "Build interactive diff review interface in Monaco supporting inline annotations and side-by-side reviews.",
                    "deliverables": "DiffReviewModal.tsx, Monaco deltaDecorations for hunks, Accept/Reject keyboard actions (Alt+N, Alt+P, Ctrl+Enter).",
                    "contract": "interface FileDiffState { filePath: string; hunks: Array<{ id: string; status: 'pending'|'accepted'|'rejected' }> }",
                    "prompt": "Create Monaco diff review UI. Add glyph margin accept/reject buttons, file list with +/- line counters, and disk sync.",
                    "test": "npm run test -- -t 'DiffReview'"
                },
                {
                    "day": 10,
                    "title": "Shadow Git Checkpoint System",
                    "goal": "Create invisible Git snapshot engine recording workspace state into refs/ai-checkpoints/ before any AI edit.",
                    "deliverables": "src-tauri/src/git/checkpoint.rs (git2 backend), automatic GC (7-day pruning, 100 max per branch).",
                    "contract": "create_checkpoint(workspace, summary) -> Result<String, String>; list_checkpoints(workspace) -> Vec<CheckpointInfo>.",
                    "prompt": "Implement Shadow Git checkpoints in Rust using git2. Commit to refs/ai-checkpoints/ without touching user HEAD. Add 7-day auto-GC.",
                    "test": "cd src-tauri && cargo test git::checkpoint"
                },
                {
                    "day": 11,
                    "title": "1-Click Time Travel & Rollback UX",
                    "goal": "Build visual checkpoint timeline panel with hover diff previews and instant one-click restoration.",
                    "deliverables": "CheckpointTimeline.tsx, diff popover preview, restore snapshot action with dirty-buffer stash protection.",
                    "contract": "restore_checkpoint(commit_hash) -> reverts working tree and reloads Monaco buffers safely.",
                    "prompt": "Build Checkpoint Timeline in React. Render vertical snapshot history, diff previews, pin buttons, and 1-click restore with stash prompt.",
                    "test": "npm run test -- -t 'CheckpointTimeline'"
                },
                {
                    "day": 12,
                    "title": "Tree-sitter AST Slicing & Structural Repo Map",
                    "goal": "Build AST parser stripping function bodies and compressing 50+ files into an 800-token structural skeleton.",
                    "deliverables": "src-tauri/src/ast/slicer.rs (Tree-sitter for TS, Py, Rust, Go), 85% input token reduction repo mapper.",
                    "contract": "generate_repo_skeleton(files: Vec<String>) -> Result<String, String>; strips method bodies, preserves types/signatures.",
                    "prompt": "Implement Tree-sitter AST Slicing in Rust. Parse TS/Python/Rust, strip function bodies to '{ ... }', and assemble 800-token repo map.",
                    "test": "cd src-tauri && cargo test ast::slicer"
                },
                {
                    "day": 13,
                    "title": "Hybrid BM25 + Vector Retrieval Engine (@codebase)",
                    "goal": "Build 2-stage retrieval pipeline combining nomic-embed-text embeddings, SQLite-vec, and BM25 cross-filtering (< 50ms).",
                    "deliverables": "src-tauri/src/rag/ (embeddings.rs, sqlite_vec.rs, bm25.rs), query_codebase command returning top 3 snippets.",
                    "contract": "query_codebase(query, max_results) -> Vec<CodeChunkResult>; Stage 1: vector top 15; Stage 2: BM25 top 3.",
                    "prompt": "Implement 2-stage RAG in Rust. Chunk files into 40-line windows, embed via nomic-embed-text, store in SQLite-vec, re-rank with BM25.",
                    "test": "cd src-tauri && cargo test rag::hybrid_retrieval"
                },
                {
                    "day": 14,
                    "title": "Chat Panel with @codebase Context & In-Editor Insertion",
                    "goal": "Implement primary AI Chat Assistant with @codebase context retrieval and 1-click diff insertion into Monaco.",
                    "deliverables": "ChatPanel.tsx, @ mentions autocomplete, streaming markdown renderer, 'Apply to Editor' diff bridge.",
                    "contract": "User types '@codebase how does auth work?' -> injects top 3 chunks + AST skeleton -> streams response.",
                    "prompt": "Build AI Chat Panel with @codebase mention triggers, streaming SSE display, and 1-click 'Apply to Editor' button routing to diff engine.",
                    "test": "npm run test -- -t 'ChatPanel'"
                }
            ]
        },
        # WEEK 3
        {
            "week": 3,
            "week_title": "WEEK 3: LANGUAGE INTELLIGENCE & DYNAMIC VRAM LIFECYCLE",
            "days": [
                {
                    "day": 15,
                    "title": "Embedded Rust LSP Client Core",
                    "goal": "Implement native JSON-RPC 2.0 Language Server Protocol client in Rust to provide compiler-grade intelligence.",
                    "deliverables": "src-tauri/src/lsp/client.rs (stdio pipe transport), auto-detection for rust-analyzer, pyright, tsserver.",
                    "contract": "LSP lifecycle: initialize, didOpen, didChange, didClose, shutdown; emits diagnostic events.",
                    "prompt": "Implement native Rust LSP JSON-RPC client communicating over stdio. Auto-detect typescript-language-server, pyright, rust-analyzer.",
                    "test": "cd src-tauri && cargo test lsp::client"
                },
                {
                    "day": 16,
                    "title": "LSP Diagnostics, Hover & Go-to-Definition",
                    "goal": "Wire LSP diagnostic feeds, hover cards, and definition navigation into Monaco Editor.",
                    "deliverables": "diagnosticsBridge.ts (Monaco markers), Monaco HoverProvider, Monaco DefinitionProvider.",
                    "contract": "Monaco editor receives real-time red/yellow squigglies; F12 jumps to cross-file symbol definitions.",
                    "prompt": "Connect Rust LSP diagnostics to Monaco markers. Implement HoverProvider (type info) and DefinitionProvider (go-to-def).",
                    "test": "npm run test -- -t 'diagnosticsBridge'"
                },
                {
                    "day": 17,
                    "title": "Hardware Profiler & Universal Memory Sentinel",
                    "goal": "Build real-time hardware monitor detecting NVIDIA CUDA, AMD ROCm, Apple Metal, Intel Arc, and CPU fallback to prevent OOM.",
                    "deliverables": "src-tauri/src/hardware/profiler.rs (multi-vendor detection), VRAM budget sentinel status bar widget.",
                    "contract": "get_hardware_profile() -> HardwareProfile; classifies into Tier 1-4 and clamps context budgets dynamically.",
                    "prompt": "Build Universal Hardware Profiler in Rust. Detect compute vendor (NVIDIA, AMD, Apple, Intel, CPU) and allocate safe context budgets across 4 tiers.",
                    "test": "cd src-tauri && cargo test hardware::profiler"
                },
                {
                    "day": 18,
                    "title": "Dynamic Task-Based Auto-Model Router",
                    "goal": "Dispatch IDE tasks to optimal parameter sizes while managing Ollama keep_alive VRAM eviction.",
                    "deliverables": "src-tauri/src/router/model_router.rs: Typing->1.5B (pinned), Edit->7B (3m), Reasoning->8B (3m), Vision->2B (3m).",
                    "contract": "route_task(intent: TaskIntent, override: Option<String>) -> ModelConfig with eviction priority manager.",
                    "prompt": "Build Task-Based Model Router. Auto-route typing events to Qwen-1.5B (pinned) and edits to Qwen-7B. Evict heavy models after 3m on <=6GB GPUs.",
                    "test": "cd src-tauri && cargo test router::model_router"
                },
                {
                    "day": 19,
                    "title": "Terminal Auto-Fix Loop",
                    "goal": "Capture test/build runtime errors from terminal output and trigger 1-click AI repair diffs.",
                    "deliverables": "errorCapture.ts (regex parser for pytest, cargo, npm, tsc), 1-click 'Auto-Fix with AI' terminal action.",
                    "contract": "Detects failure at file.ts:42 -> prompts Qwen-7B with error context -> generates frugal diff.",
                    "prompt": "Build terminal error capture for pytest, cargo, and npm. Extract file/line numbers and render 'Fix with AI' button triggering diff repair.",
                    "test": "npm run test -- -t 'errorCapture'"
                },
                {
                    "day": 20,
                    "title": "Local Whisper Voice Dictation",
                    "goal": "Integrate 100% offline push-to-talk voice prompt dictation using embedded whisper.cpp (< 75MB RAM).",
                    "deliverables": "src-tauri/src/audio/ (cpal audio capture, whisper.cpp bindings), global Ctrl+Space push-to-talk hook.",
                    "contract": "Ctrl+Space record -> transcribe local audio buffer -> stream text into editor or chat panel.",
                    "prompt": "Integrate whisper.cpp and cpal in Rust. Capture mic audio on Ctrl+Space hold, run local offline transcription, and insert into editor/chat.",
                    "test": "cd src-tauri && cargo test audio::whisper"
                },
                {
                    "day": 21,
                    "title": "Live Generative Sandboxed Canvas",
                    "goal": "Build isolated live-preview canvas rendering AI-generated React, Tailwind HTML, and Mermaid charts.",
                    "deliverables": "LiveCanvas.tsx (sandboxed iframe, CSP no-network), local Babel compiler, split-view canvas panel.",
                    "contract": "Safe sandboxed iframe rendering generated UI components without remote network access.",
                    "prompt": "Build Live Canvas in React using an isolated iframe with strict CSP. Bundle in-memory Babel and Tailwind to render UI snippets live.",
                    "test": "npm run test -- -t 'LiveCanvas'"
                }
            ]
        },
        # WEEK 4
        {
            "week": 4,
            "week_title": "WEEK 4: AGENT PROTOCOLS, ENTERPRISE AIR-GAP & DISTRIBUTION",
            "days": [
                {
                    "day": 22,
                    "title": "MCP (Model Context Protocol) Client & Guardrails",
                    "goal": "Implement native Anthropic MCP client with strict JSON schema validation and retry prompting for local 7B models.",
                    "deliverables": "src-tauri/src/mcp/client.rs (stdio transport), schema validator, one-tool-at-a-time fallback retries.",
                    "contract": "execute_mcp_tool(call: McpToolCall) -> Result<Value, String>; catches schema violations before execution.",
                    "prompt": "Implement MCP Client in Rust over stdio for SQLite and Filesystem servers. Validate tool call JSON against schemas and add retry fallback.",
                    "test": "cd src-tauri && cargo test mcp::client"
                },
                {
                    "day": 23,
                    "title": "TypeScript Plugin Architecture & Extension Host",
                    "goal": "Build extensibility engine allowing community plugins to contribute UI panels, status bar items, and commands.",
                    "deliverables": "PluginHost.ts, OpenStudioPlugin interface, sandboxed API (EditorAPI, TerminalAPI, CommandAPI), .osp bundle loader.",
                    "contract": "interface OpenStudioPlugin { id: string; activate(ctx: PluginContext): void; deactivate(): void; }",
                    "prompt": "Implement PluginHost in TypeScript. Provide sandboxed APIs for editor, terminal, and UI panels. Support drag-and-drop .osp bundles.",
                    "test": "npm run test -- -t 'PluginHost'"
                },
                {
                    "day": 24,
                    "title": "Zero-Telemetry Air-Gap Enforcement & Security CI",
                    "goal": "Enforce air-gapped compliance: automated network audit script, local SQLite audit logger, and .openstudio/rules.yaml.",
                    "deliverables": "scripts/verify-airgap.sh (fails CI on unannotated network calls), audit_logger.rs, rules.yaml policy engine.",
                    "contract": "CI fails if unannotated network call found; rules.yaml excludes .env and secrets from AI context.",
                    "prompt": "Build air-gap verification script scanning for network calls. Implement local encrypted SQLite audit log. Enforce rules.yaml context boundaries.",
                    "test": "bash scripts/verify-airgap.sh && cd src-tauri && cargo test security::audit_logger"
                },
                {
                    "day": 25,
                    "title": "Performance Benchmarking Harness",
                    "goal": "Build automated performance test suite validating all latency, indexing, and memory claims.",
                    "deliverables": "bench/ttft.py (<40ms), bench/diff_latency.py (<2s), bench/index_build.py (<60s for 10k files), BENCHMARKS.md generator.",
                    "contract": "Automated scripts benchmark P50/P95 latency and memory footprint; asserts all meet v2.0 specs.",
                    "prompt": "Create benchmark suite in bench/. Test autocomplete TTFT, 7B diff generation, and repo indexing speed. Generate BENCHMARKS.md.",
                    "test": "python bench/ttft.py && python bench/diff_latency.py"
                },
                {
                    "day": 26,
                    "title": "Standalone VS Code Extension Wedge",
                    "goal": "Package Model Router, Token Optimizer, and Shadow Git as a VS Code extension for immediate developer distribution.",
                    "deliverables": "extensions/vscode/ (package.json, extension.ts), inline completion provider, frugal diff commands, .vsix bundle.",
                    "contract": "Drop-in VS Code extension providing local Qwen-1.5B autocomplete and shadow checkpoints inside standard VS Code.",
                    "prompt": "Build standalone VS Code extension in extensions/vscode/. Reuse frugal diff parser and FIM formatter to offer local AI in VS Code.",
                    "test": "cd extensions/vscode && npm run compile && npm run test"
                },
                {
                    "day": 27,
                    "title": "Cross-Platform Packaging & Installer",
                    "goal": "Configure Tauri v2 release bundles for Windows (.msi/.exe), macOS (.dmg Metal), and Linux with code signing setup.",
                    "deliverables": "tauri.conf.json bundle configuration, .github/workflows/release.yml automated multi-platform release builder.",
                    "contract": "Produces standalone installers for Windows x64, macOS arm64/x64, and Linux deb/AppImage.",
                    "prompt": "Configure Tauri v2 multi-platform packaging in tauri.conf.json. Set up GitHub Actions CI workflow to build release installers on git tag.",
                    "test": "npm run tauri build"
                },
                {
                    "day": 28,
                    "title": "Production Hardening, Docs & Launch Kit",
                    "goal": "Complete end-to-end audit, finalize documentation, and prepare community launch campaign.",
                    "deliverables": "README.md with demo recordings, SECURITY.md, PRIVACY.md, CONTRIBUTING.md, r/LocalLLaMA & HN Show HN launch post.",
                    "contract": "Full test suites pass across Rust & TypeScript; zero compilation warnings; production tag v1.0.0-GA.",
                    "prompt": "Perform final hardening pass. Verify all unit tests and benchmarks pass. Generate production documentation and Show HN / LocalLLaMA launch kit.",
                    "test": "npm run test && cd src-tauri && cargo test && bash scripts/verify-airgap.sh"
                }
            ]
        }
    ]

    # BUILD DOCUMENT FLOW
    for w_idx, week_info in enumerate(days_data):
        if w_idx > 0:
            story.append(PageBreak())
        
        # Week Header Banner Table
        w_banner = Table([[Paragraph(f"<b>{week_info['week_title']}</b>", h1_style)]], colWidths=[540])
        w_banner.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_primary),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(w_banner)
        story.append(Spacer(1, 8))

        # Render each day
        for day in week_info['days']:
            day_elements = []
            
            # Day Title Header
            day_title_p = Paragraph(f"<b>DAY {day['day']}: {day['title'].upper()}</b>", h2_style)
            day_elements.append(day_title_p)

            # Details table
            day_content = [
                [
                    Paragraph("<b>Objective:</b>", bold_label),
                    Paragraph(day['goal'], body_style)
                ],
                [
                    Paragraph("<b>Deliverables:</b>", bold_label),
                    Paragraph(day['deliverables'], body_style)
                ],
                [
                    Paragraph("<b>Interface / Contract:</b>", bold_label),
                    Paragraph(f"<code>{day['contract']}</code>", code_style)
                ],
                [
                    Paragraph("<b>Antigravity Prompt:</b>", bold_label),
                    Paragraph(f"<i>&ldquo;{day['prompt']}&rdquo;</i>", prompt_style)
                ],
                [
                    Paragraph("<b>Test Command:</b>", bold_label),
                    Paragraph(f"<code>{day['test']}</code>", code_style)
                ],
            ]

            day_table = Table(day_content, colWidths=[110, 422])
            day_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFFFF")),
                ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
                ('TOPPADDING', (0,0), (-1,-1), 2.5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
                ('LEFTPADDING', (0,0), (-1,-1), 5),
                ('RIGHTPADDING', (0,0), (-1,-1), 5),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            
            day_elements.append(day_table)
            day_elements.append(Spacer(1, 6))

            story.append(KeepTogether(day_elements))

    # Append Execution Protocol
    story.append(Spacer(1, 10))
    proto_title = Paragraph("<b>ANTIGRAVITY ONE-SHOT EXECUTION PROTOCOL</b>", h2_style)
    proto_body = Paragraph(
        "To execute this blueprint with Antigravity: "
        "<b>1) Target One Day at a Time:</b> Prompt Antigravity with <i>'Execute Day X of OPEN_STUDIO_EXECUTION_MASTERPLAN.md'</i>. "
        "<b>2) Strict Deliverable Enforcement:</b> Ensure all files in Deliverables and Interface contracts are generated without placeholders. "
        "<b>3) Automated Test Gate:</b> Run the exact Test Command listed for the day. Do not proceed to Day X+1 until the test command exits with code 0.",
        body_style
    )
    story.append(KeepTogether([proto_title, proto_body]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {output_filename}")

if __name__ == "__main__":
    create_blueprint_pdf()
