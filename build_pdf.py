import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted
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

        if self._pageNumber > 1:
            self.drawString(40, letter[1] - 30, "OPEN STUDIO: 12-WEEK AGENTIC EXECUTION BLUEPRINT")
            self.drawRightString(letter[0] - 40, letter[1] - 30, "FOR ANTIGRAVITY ONE-SHOT IMPLEMENTATION")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, letter[1] - 34, letter[0] - 40, letter[1] - 34)

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
    
    c_primary = colors.HexColor("#0F172A")
    c_blue = colors.HexColor("#2563EB")
    c_dark_code = colors.HexColor("#1E293B")
    c_border = colors.HexColor("#E2E8F0")
    c_text = colors.HexColor("#1E293B")
    c_muted = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_blue,
        spaceAfter=8
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=c_muted
    )

    h1_style = ParagraphStyle(
        'PhaseHeading',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.white
    )

    h2_style = ParagraphStyle(
        'DayHeading',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_primary,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_text,
        spaceAfter=2
    )

    bold_label = ParagraphStyle(
        'BoldLabel',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_primary
    )

    prompt_style = ParagraphStyle(
        'PromptStyle',
        fontName='Courier',
        fontSize=7.4,
        leading=9.5,
        textColor=colors.HexColor("#1E1B4B")
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#2563EB")
    )

    story = []

    story.append(Paragraph("OPEN STUDIO: 12-WEEK / 3-PHASE AGENTIC EXECUTION BLUEPRINT", title_style))
    story.append(Paragraph("Machine-Actionable Engineering Roadmap for Antigravity One-Shot Implementation", subtitle_style))
    story.append(Spacer(1, 3))

    meta_data = [
        [
            Paragraph("<b>Target Stack:</b> Tauri v2 (Rust) + React 18/19 (TS) + Monaco", meta_style),
            Paragraph("<b>Hardware:</b> Universal Acceleration (NVIDIA, AMD, Apple, Intel, CPU)", meta_style),
        ],
        [
            Paragraph("<b>Inference:</b> Ollama (SSE) + llama.cpp + MLX", meta_style),
            Paragraph("<b>Latency Targets:</b> &lt; 40ms Tab Ghost-Text • &lt; 2s In-line Diffs", meta_style),
        ],
        [
            Paragraph("<b>Structure:</b> Phase 1 MVP (W1-4), Phase 2 Smart (W5-8), Phase 3 Ready (W9-12)", meta_style),
            Paragraph("<b>Air-Gap Guarantee:</b> Verifiable Zero-Telemetry CI Verified", meta_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # Phase 1 Days (Weeks 1 to 4: 20 Days)
    phase1_weeks = [
        {
            "title": "PHASE 1 (WEEK 1): DESKTOP SHELL & EDITOR INFRASTRUCTURE",
            "days": [
                {
                    "day": 1,
                    "title": "Project Scaffolding & Tauri v2 Shell",
                    "goal": "Setup production Tauri v2 workspace with Rust core, Vite + React + TS, and Tailwind CSS in an air-gapped dark theme.",
                    "deliverables": "src-tauri/Cargo.toml, tauri.conf.json (offline CSP), AppSystemInfo IPC bridge (get_system_info).",
                    "contract": "get_system_info() -> Result<AppSystemInfo, String> returning OS, architecture, total RAM.",
                    "prompt": "Scaffold Tauri v2 + React 18 + TS + Tailwind. Implement get_system_info IPC command. Configure strict offline CSP. Verify cargo check & npm run build.",
                    "test": "cd src-tauri && cargo check && cd .. && npm run build"
                },
                {
                    "day": 2,
                    "title": "Monaco Editor Core & Offline Bundling",
                    "goal": "Integrate Monaco Editor with local worker bundling via Vite, multi-tab buffer store, split panes, and dirty tracking.",
                    "deliverables": "MonacoEditor.tsx (open-studio-dark theme), editorStore.ts (Zustand), vite.config.ts worker setup, TabBar.tsx.",
                    "contract": "interface EditorBuffer { id: string; filePath: string; content: string; isDirty: boolean; }",
                    "prompt": "Bundle Monaco locally without CDNs. Implement Zustand editorStore for open buffers, tabs, and split panes. Wire Ctrl+S, Ctrl+W, Ctrl+\\.",
                    "test": "npm run test -- -t 'editorStore' && npm run build"
                },
                {
                    "day": 3,
                    "title": "Native File Explorer & Virtualized Tree",
                    "goal": "Build native filesystem watcher and recursive directory explorer capable of managing 50,000+ files without UI lag.",
                    "deliverables": "src-tauri/src/fs/ (notify-debouncer-mini, walkdir), FileTree.tsx (virtualized list, git status badges).",
                    "contract": "read_workspace_tree(root: String, depth: usize) -> Result<FileNode, String>; emits 'workspace-fs-change'.",
                    "prompt": "Implement read_workspace_tree respecting .gitignore. Stream fs-change events via notify. Render virtualized tree linking to editorStore.",
                    "test": "cd src-tauri && cargo test fs_tree && cd .. && npm run test -- -t 'FileTree'"
                },
                {
                    "day": 4,
                    "title": "Embedded Terminal Infrastructure (Rust PTY + xterm.js)",
                    "goal": "Embed native cross-platform PTY terminal supporting PowerShell/cmd and bash/zsh with ANSI color streams and resize handling.",
                    "deliverables": "src-tauri/src/terminal/ (portable-pty), TerminalPanel.tsx (xterm.js + fit addon).",
                    "contract": "spawn_terminal_session(id, shell), write_terminal_input(id, data), resize_terminal(id, cols, rows).",
                    "prompt": "Build PTY backend with portable-pty crate. Stream terminal bytes to frontend xterm.js. Wire resize handler and input dispatch.",
                    "test": "cd src-tauri && cargo test terminal_pty && cd .. && npm run build"
                },
                {
                    "day": 5,
                    "title": "Week 1 Integration & Testing",
                    "goal": "Unify File Tree, Monaco Editor, TabBar, and Terminal Panel into a cohesive workspace shell; run test suite.",
                    "deliverables": "src/App.tsx cohesive layout with draggable panels and collapse toggles, test suite, milestone tag v0.1.0-w1.",
                    "contract": "Full app launches offline, editor tabs switch smoothly, terminal executes commands without latency.",
                    "prompt": "Perform Week 1 integration pass. Connect FileTree, Monaco, Terminal in App.tsx. Run end-to-end typing and terminal execution tests.",
                    "test": "npm run build && cd src-tauri && cargo check --release"
                }
            ]
        },
        {
            "title": "PHASE 1 (WEEK 2): INFERENCE GATEWAY & INLINE AUTOCOMPLETE",
            "days": [
                {
                    "day": 6,
                    "title": "Ollama Inference Gateway & SSE Streaming",
                    "goal": "Build multi-backend async HTTP streaming client for Ollama with SSE token streaming, abort controls, and health-check ping.",
                    "deliverables": "src-tauri/src/inference/ (reqwest SSE client), stream_completion command emitting 'llm-chunk', abort_completion.",
                    "contract": "stream_completion(window, request_id, req: CompletionRequest) -> Result<(), String> with keep_alive support.",
                    "prompt": "Implement Ollama streaming SSE gateway using reqwest. Emit chunk events keyed by request_id. Implement cancellation via oneshot channels.",
                    "test": "cd src-tauri && cargo test inference_gateway"
                },
                {
                    "day": 7,
                    "title": "Inference Priority Queue & Concurrency Sentinel",
                    "goal": "Implement request priority queue ensuring latency-critical autocomplete immediately preempts background chat or indexing.",
                    "deliverables": "src-tauri/src/inference/queue.rs with 4 priority levels (Abort > Autocomplete > Chat > Background).",
                    "contract": "Priority queue yields low-priority tasks when inline completion is requested; prevents Ollama resource contention.",
                    "prompt": "Implement Inference Priority Queue in Rust (src-tauri/src/inference/queue.rs) with 4 priority levels to guarantee sub-40ms autocomplete.",
                    "test": "cd src-tauri && cargo test inference::queue"
                },
                {
                    "day": 8,
                    "title": "Inline Ghost-Text Autocomplete Engine",
                    "goal": "Build sub-40ms inline Tab autocompletion inside Monaco powered by resident Qwen2.5-Coder-1.5B.",
                    "deliverables": "inlineProvider.ts (Monaco InlineCompletionsProvider), FIM prompt formatter, 30ms keystroke debouncer.",
                    "contract": "formatFIMPrompt(prefix, suffix) -> '<|fim_prefix|>...<|fim_suffix|>...<|fim_middle|>'; Tab accepts.",
                    "prompt": "Implement Monaco InlineCompletionsProvider. Extract cursor context, format Qwen FIM prompt, debounce 30ms, query Ollama (keep_alive: -1).",
                    "test": "npm run test -- -t 'inlineProvider'"
                },
                {
                    "day": 9,
                    "title": "Autocomplete Benchmark & Latency Verification",
                    "goal": "Validate sub-40ms Time-To-First-Token (TTFT) and memory footprint under heavy typing simulation.",
                    "deliverables": "bench/ttft.py benchmark harness, automated pass/fail latency assertions (< 40ms average).",
                    "contract": "bench/ttft.py asserts average TTFT < 40ms across 50 requests; memory profiler verifies < 50MB shell.",
                    "prompt": "Create benchmark script bench/ttft.py sending 50 synthetic FIM requests to Ollama and assert average TTFT < 40ms.",
                    "test": "python bench/ttft.py"
                },
                {
                    "day": 10,
                    "title": "Week 2 Polish & Connection Error Recovery",
                    "goal": "Add status bar AI health indicator, automatic reconnect on Ollama restart, and error recovery banners.",
                    "deliverables": "Status bar AI widget ('AI Ready' / 'Ollama Offline'), reconnect listener, milestone tag v0.1.0-w2.",
                    "contract": "Status bar reflects real-time Ollama connectivity; automatically polls and resumes when Ollama restarts.",
                    "prompt": "Add status bar AI health indicator and automatic reconnect logic for Ollama in src/components/statusbar/.",
                    "test": "npm run build && cd src-tauri && cargo check --release"
                }
            ]
        },
        {
            "title": "PHASE 1 (WEEK 3): CHAT & DIFF ENGINE",
            "days": [
                {
                    "day": 11,
                    "title": "AI Chat Assistant Core",
                    "goal": "Build primary AI Chat sidebar with streaming Markdown rendering, code blocks, and conversation state management.",
                    "deliverables": "src/components/chat/ChatPanel.tsx, virtualized message history, markdown renderer with copy buttons.",
                    "contract": "Chat panel streams tokens in real-time, formats markdown code blocks, supports cancel and retry.",
                    "prompt": "Build AI Chat Assistant in src/components/chat/ChatPanel.tsx with streaming SSE display, markdown highlighting, and Zustand history.",
                    "test": "npm run test -- -t 'ChatPanel'"
                },
                {
                    "day": 12,
                    "title": "@file Context Injection",
                    "goal": "Implement explicit file context injection (@file:path/to/file) allowing users to query specific files without complex RAG.",
                    "deliverables": "@ mention auto-complete dropdown in chat input, file content resolution into prompt context.",
                    "contract": "Typing '@' presents fuzzy file list; selected file is read from disk and prepended to prompt context.",
                    "prompt": "Implement @file context injection in chat panel. Show fuzzy file dropdown on '@', resolve content, and inject into system prompt.",
                    "test": "npm run test -- -t 'fileMention'"
                },
                {
                    "day": 13,
                    "title": "Frugal Search/Replace Diff Parser with Line Anchors",
                    "goal": "Build deterministic diff parser saving 98% output tokens by generating only modified lines with line-number hints.",
                    "deliverables": "src-tauri/src/diff/frugal_parser.rs parsing SEARCH (line 42) / ======= / REPLACE blocks.",
                    "contract": "parse_frugal_diff(output) -> Vec<DiffHunk>; 3-tier matching (exact, line-anchored, whitespace-trimmed).",
                    "prompt": "Implement Frugal Diff Parser in Rust with line-number hints (SEARCH (line 42)). Implement exact, anchored, and trimmed matching.",
                    "test": "cd src-tauri && cargo test diff::frugal_parser"
                },
                {
                    "day": 14,
                    "title": "Monaco Multi-File Diff Review UI",
                    "goal": "Build interactive diff review interface in Monaco supporting inline annotations and side-by-side reviews.",
                    "deliverables": "src/components/diff/DiffReviewModal.tsx, Monaco deltaDecorations for hunks, Accept/Reject keyboard actions.",
                    "contract": "interface FileDiffState { filePath: string; hunks: Array<{ id: string; status: 'pending'|'accepted'|'rejected' }> }",
                    "prompt": "Create Monaco diff review UI. Add glyph margin accept/reject buttons, file list with +/- line counters, and disk sync.",
                    "test": "npm run test -- -t 'DiffReview'"
                },
                {
                    "day": 15,
                    "title": "Week 3 Integration & In-Editor Code Insertion",
                    "goal": "Connect chat diff responses directly to active Monaco buffer with 1-click 'Apply Changes'.",
                    "deliverables": "'Apply to Editor' CTA button in chat code blocks routing to diff engine, milestone tag v0.1.0-w3.",
                    "contract": "Clicking 'Apply to Editor' opens diff review with parsed hunks; accepting changes updates disk and buffer.",
                    "prompt": "Connect chat diff responses to Monaco editor with 1-click 'Apply to Editor' routing to diff review engine.",
                    "test": "npm run build && cd src-tauri && cargo check --release"
                }
            ]
        },
        {
            "title": "PHASE 1 (WEEK 4): SAFETY NET, SHELL POLISH & MVP EXIT GATE",
            "days": [
                {
                    "day": 16,
                    "title": "Shadow Git Checkpoints (1-Click Rollback)",
                    "goal": "Implement automatic background workspace snapshots before any AI diff application using Git stash/commit objects.",
                    "deliverables": "src-tauri/src/git/checkpoint.rs (refs/ai-checkpoints/), create_checkpoint, list_checkpoints, restore_checkpoint.",
                    "contract": "create_checkpoint(workspace, summary) -> Result<String, String>; restore_checkpoint reverts working tree safely.",
                    "prompt": "Implement Shadow Git checkpoints in Rust using git2. Commit to refs/ai-checkpoints/ without touching user HEAD. Add 1-click restore.",
                    "test": "cd src-tauri && cargo test git::checkpoint"
                },
                {
                    "day": 17,
                    "title": "State Persistence Engine",
                    "goal": "Ensure workspace state survives application restarts (open tabs, active file, split layout, recent files).",
                    "deliverables": "src/stores/persistence.ts debounced sync to .openstudio/workspace.json; rehydration on app launch.",
                    "contract": "Persists open tabs, cursor position, active file, split layout; rehydrates seamlessly on startup.",
                    "prompt": "Build State Persistence Engine in src/stores/persistence.ts. Save open tabs, layout, and recent files into .openstudio/workspace.json.",
                    "test": "npm run test -- -t 'persistence'"
                },
                {
                    "day": 18,
                    "title": "Command Palette (Ctrl+Shift+P)",
                    "goal": "Implement global fuzzy-searchable Command Palette for all editor, AI, and window actions.",
                    "deliverables": "src/components/palette/CommandPalette.tsx, fuzzy matcher, action registry (open file, toggle terminal, clear chat).",
                    "contract": "Ctrl+Shift+P opens fuzzy searchable action modal with keyboard navigation (Up/Down/Enter/Esc).",
                    "prompt": "Implement Command Palette in src/components/palette/CommandPalette.tsx with fuzzy search over commands, files, and AI actions.",
                    "test": "npm run test -- -t 'CommandPalette'"
                },
                {
                    "day": 19,
                    "title": "Settings & Preferences UI (Ctrl+,)",
                    "goal": "Build clean Settings modal allowing users to configure Ollama URLs, model selections, tab size, and themes.",
                    "deliverables": "src/components/settings/SettingsModal.tsx, .openstudio/settings.json persistence.",
                    "contract": "Ctrl+, opens Settings modal; persists Ollama endpoint, model selections, theme, and tab preferences.",
                    "prompt": "Build Settings Modal in src/components/settings/SettingsModal.tsx triggered by Ctrl+,. Persist settings to .openstudio/settings.json.",
                    "test": "npm run test -- -t 'SettingsModal'"
                },
                {
                    "day": 20,
                    "title": "First-Run Onboarding & Phase 1 MVP Exit Gate",
                    "goal": "Guide new users on startup: check Ollama health, offer 1-click model pull (Qwen-1.5B), and run full MVP verification.",
                    "deliverables": "src/components/onboarding/OnboardingWizard.tsx, complete Phase 1 test pass, tag v0.1.0-MVP.",
                    "contract": "Full Phase 1 exit gate: opens repo, provides sub-40ms autocomplete, chat with @file, diffs, and rollback 100% offline.",
                    "prompt": "Build Onboarding Wizard checking Ollama status and offering 1-click model download. Execute full Phase 1 smoke test pass.",
                    "test": "npm run build && cd src-tauri && cargo test && cd .. && npm run test"
                }
            ]
        }
    ]

    for w_idx, week_info in enumerate(phase1_weeks):
        if w_idx > 0:
            story.append(PageBreak())
        
        w_banner = Table([[Paragraph(f"<b>{week_info['title']}</b>", h1_style)]], colWidths=[540])
        w_banner.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_primary),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 7),
            ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(w_banner)
        story.append(Spacer(1, 6))

        for day in week_info['days']:
            day_elements = []
            day_title_p = Paragraph(f"<b>DAY {day['day']}: {day['title'].upper()}</b>", h2_style)
            day_elements.append(day_title_p)

            day_content = [
                [Paragraph("<b>Objective:</b>", bold_label), Paragraph(day['goal'], body_style)],
                [Paragraph("<b>Deliverables:</b>", bold_label), Paragraph(day['deliverables'], body_style)],
                [Paragraph("<b>Interface / Contract:</b>", bold_label), Paragraph(f"<code>{day['contract']}</code>", code_style)],
                [Paragraph("<b>Antigravity Prompt:</b>", bold_label), Paragraph(f"<i>&ldquo;{day['prompt']}&rdquo;</i>", prompt_style)],
                [Paragraph("<b>Test Command:</b>", bold_label), Paragraph(f"<code>{day['test']}</code>", code_style)],
            ]

            day_table = Table(day_content, colWidths=[105, 427])
            day_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFFFF")),
                ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
                ('TOPPADDING', (0,0), (-1,-1), 2),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ('LEFTPADDING', (0,0), (-1,-1), 5),
                ('RIGHTPADDING', (0,0), (-1,-1), 5),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            
            day_elements.append(day_table)
            day_elements.append(Spacer(1, 5))
            story.append(KeepTogether(day_elements))

    # Phase 2 & 3 Summary Page
    story.append(PageBreak())
    
    p2_banner = Table([[Paragraph("<b>PHASE 2: \"IT'S SMART\" INTELLIGENCE & CONTEXT (WEEKS 5–8)</b>", h1_style)]], colWidths=[540])
    p2_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E3A8A")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(p2_banner)
    story.append(Spacer(1, 6))

    phase2_rows = [
        [
            Paragraph("<b>Week 5: Codebase Indexing</b>", bold_label),
            Paragraph("Tree-sitter AST slicer (800-token skeleton) + BM25 keyword search over raw files for @codebase v1. <code>cargo test ast::slicer</code>", body_style)
        ],
        [
            Paragraph("<b>Week 6: Vector RAG & Hybrid</b>", bold_label),
            Paragraph("nomic-embed-text + SQLite-vec chunk storage; 2-stage retrieval (Vector top-15 -> BM25 top-3) for full @codebase v2. <code>cargo test rag::hybrid_retrieval</code>", body_style)
        ],
        [
            Paragraph("<b>Week 7: LSP & Memory Sentinel</b>", bold_label),
            Paragraph("Rust LSP client using <code>lsp-types</code> crate for TS & Python; Monaco diagnostics/hover/def; sysinfo + Ollama /api/ps memory profiler. <code>cargo test lsp::client</code>", body_style)
        ],
        [
            Paragraph("<b>Week 8: Router & Auto-Fix</b>", bold_label),
            Paragraph("Dynamic task-based model router (Typing->1.5B, Edit->7B, Think->8B) with keep_alive eviction; Terminal regex auto-fix loop. <code>cargo test router::model_router</code>", body_style)
        ],
    ]
    p2_table = Table(phase2_rows, colWidths=[130, 402])
    p2_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(p2_table)
    story.append(Spacer(1, 10))

    p3_banner = Table([[Paragraph("<b>PHASE 3: \"IT'S READY\" PRODUCTION & DISTRIBUTION (WEEKS 9–12)</b>", h1_style)]], colWidths=[540])
    p3_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#065F46")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(p3_banner)
    story.append(Spacer(1, 6))

    phase3_rows = [
        [
            Paragraph("<b>Week 9: Checkpoints & MCP</b>", bold_label),
            Paragraph("Full Checkpoint Timeline UI with hover diffs & auto-GC; Native MCP client with schema validation & fallback retry. <code>cargo test mcp::client</code>", body_style)
        ],
        [
            Paragraph("<b>Week 10: Plugins & Extension</b>", bold_label),
            Paragraph("TypeScript OpenStudioPlugin host; Standalone VS Code extension wedge (FIM autocomplete + frugal diff) for early user acquisition. <code>npm run test:vscode</code>", body_style)
        ],
        [
            Paragraph("<b>Week 11: Security & Packaging</b>", bold_label),
            Paragraph("Zero-telemetry CI verification (verify-airgap.sh), SQLite encrypted audit log, rules.yaml policy engine, Tauri packaging (.msi, .dmg, .AppImage). <code>npm run tauri build</code>", body_style)
        ],
        [
            Paragraph("<b>Week 12: Launch & Hardening</b>", bold_label),
            Paragraph("End-to-end stress testing, production docs (README, SECURITY, PRIVACY), community launch kit (Show HN, r/LocalLLaMA). Tag <code>v1.0.0-GA</code>.", body_style)
        ],
    ]
    p3_table = Table(phase3_rows, colWidths=[130, 402])
    p3_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(p3_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {output_filename}")

if __name__ == "__main__":
    create_blueprint_pdf()
