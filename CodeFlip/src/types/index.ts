export type Language = 'python' | 'typescript';

export interface CodeFile {
  language: Language;
  content: string;
}

export interface Problem {
  id: string;
  title: string;
  python: string;
  typescript: string;
  createdAt: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  language: Language;
  executedAt: number;
}

export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
}

export interface PistonRequest {
  language: string;
  version: string;
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
  run_timeout?: number;
  compile_timeout?: number;
}

export interface PistonResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string | null;
  };
  compile?: {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string | null;
  };
}
