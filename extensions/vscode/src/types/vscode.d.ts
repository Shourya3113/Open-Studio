/**
 * Ambient type definitions for the Visual Studio Code Extension API.
 * Provides 100% offline, self-contained typings for compilation without external npm downloads.
 */

declare module 'vscode' {
  export class Position {
    readonly line: number;
    readonly character: number;
    constructor(line: number, character: number);
    isEqual(other: Position): boolean;
    compareTo(other: Position): number;
    translate(lineDelta?: number, characterDelta?: number): Position;
    with(line?: number, character?: number): Position;
  }

  export class Range {
    readonly start: Position;
    readonly end: Position;
    constructor(start: Position, end: Position);
    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
    readonly isEmpty: boolean;
    readonly isSingleLine: boolean;
    contains(positionOrRange: Position | Range): boolean;
    isEqual(other: Range): boolean;
  }

  export interface Disposable {
    dispose(): any;
  }

  export interface CancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested(listener: (e: any) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
  }

  export interface TextLine {
    readonly lineNumber: number;
    readonly text: string;
    readonly range: Range;
    readonly rangeIncludingLineBreak: Range;
    readonly firstNonWhitespaceCharacterIndex: number;
    readonly isEmptyOrWhitespace: boolean;
  }

  export class Uri {
    readonly scheme: string;
    readonly authority: string;
    readonly path: string;
    readonly query: string;
    readonly fragment: string;
    readonly fsPath: string;
    constructor(scheme: string, authority: string, path: string, query: string, fragment: string);
    static file(path: string): Uri;
    static parse(value: string, _strict?: boolean): Uri;
    toString(skipEncoding?: boolean): string;
  }

  export type Event<T> = (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => Disposable;

  export class EventEmitter<T> {
    readonly event: Event<T>;
    fire(data: T): void;
    dispose(): void;
  }

  export interface WorkspaceFolder {
    readonly uri: Uri;
    readonly name: string;
    readonly index: number;
  }

  export class TextEdit {
    range: Range;
    newText: string;
    constructor(range: Range, newText: string);
    static replace(range: Range, newText: string): TextEdit;
    static insert(position: Position, newText: string): TextEdit;
    static delete(range: Range): TextEdit;
  }

  export class WorkspaceEdit {
    replace(uri: Uri, range: Range, newText: string): void;
    insert(uri: Uri, position: Position, newText: string): void;
    delete(uri: Uri, range: Range): void;
  }

  export interface TextDocumentContentProvider {
    onDidChange?: Event<Uri>;
    provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string>;
  }

  export interface TextDocument {
    readonly uri: Uri;
    readonly fileName: string;
    readonly isUntitled: boolean;
    readonly languageId: string;
    readonly version: number;
    readonly isDirty: boolean;
    readonly lineCount: number;
    lineAt(line: number): TextLine;
    lineAt(position: Position): TextLine;
    offsetAt(position: Position): number;
    positionAt(offset: number): Position;
    getText(range?: Range): string;
  }

  export interface TextEditorEdit {
    replace(location: Position | Range, value: string): void;
    insert(location: Position, value: string): void;
    delete(location: Range): void;
  }

  export interface Selection extends Range {
    readonly anchor: Position;
    readonly active: Position;
    readonly isReversed: boolean;
  }

  export interface TextEditor {
    readonly document: TextDocument;
    selection: Selection;
    selections: Selection[];
    edit(callback: (editBuilder: TextEditorEdit) => void, options?: { undoStopBefore: boolean; undoStopAfter: boolean }): Thenable<boolean>;
  }

  export enum InlineCompletionTriggerKind {
    Invoke = 0,
    Automatic = 1,
  }

  export interface InlineCompletionContext {
    readonly triggerKind: InlineCompletionTriggerKind;
    readonly selectedCompletionInfo?: {
      readonly range: Range;
      readonly text: string;
    };
  }

  export class InlineCompletionItem {
    insertText: string;
    range?: Range;
    filterText?: string;
    constructor(insertText: string, range?: Range);
  }

  export class InlineCompletionList {
    items: InlineCompletionItem[];
    constructor(items: InlineCompletionItem[]);
  }

  export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

  export interface InlineCompletionItemProvider {
    provideInlineCompletionItems(
      document: TextDocument,
      position: Position,
      context: InlineCompletionContext,
      token: CancellationToken
    ): ProviderResult<InlineCompletionItem[] | InlineCompletionList>;
  }

  export enum StatusBarAlignment {
    Left = 1,
    Right = 2,
  }

  export interface StatusBarItem extends Disposable {
    readonly alignment: StatusBarAlignment;
    readonly priority?: number;
    text: string;
    tooltip?: string;
    color?: string;
    backgroundColor?: any;
    command?: string;
    show(): void;
    hide(): void;
  }

  export interface WorkspaceConfiguration {
    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    has(section: string): boolean;
    update(section: string, value: any, configurationTarget?: boolean | any): Thenable<void>;
  }

  export interface ExtensionContext {
    readonly subscriptions: Disposable[];
    readonly extensionUri: any;
    readonly extensionPath: string;
  }

  export namespace languages {
    export function registerInlineCompletionItemProvider(
      selector: any,
      provider: InlineCompletionItemProvider
    ): Disposable;
  }

  export namespace commands {
    export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    export function executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T>;
  }

  export namespace window {
    export const activeTextEditor: TextEditor | undefined;
    export function showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    export function showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    export function showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    export function createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
  }

  export namespace workspace {
    export const workspaceFolders: readonly WorkspaceFolder[] | undefined;
    export function getConfiguration(section?: string): WorkspaceConfiguration;
    export function onDidChangeConfiguration(listener: (e: any) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
    export function applyEdit(edit: WorkspaceEdit): Thenable<boolean>;
    export function registerTextDocumentContentProvider(
      scheme: string,
      provider: TextDocumentContentProvider
    ): Disposable;
    export function openTextDocument(uriOrFileName: Uri | string): Thenable<TextDocument>;
  }

  export namespace env {
    export const clipboard: {
      readText(): Thenable<string>;
      writeText(value: string): Thenable<void>;
    };
  }
}
