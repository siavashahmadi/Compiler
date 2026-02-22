import axios from 'axios';
import { Language, PistonRequest, PistonResponse, ExecutionResult } from '../types';

// Set EXPO_PUBLIC_API_URL in .env.local (see .env.example)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v2/piston';

// Piston runtime config per language.
// Versions fetched from: GET https://emkc.org/api/v2/piston/runtimes
const RUNTIMES: Record<Language, { language: string; version: string; filename: string }> = {
  python: {
    language: 'python',
    version: '3.10.0',
    filename: 'solution.py',
  },
  typescript: {
    language: 'typescript',
    version: '5.0.3',
    filename: 'solution.ts',
  },
};

export async function executeCode(
  language: Language,
  code: string
): Promise<ExecutionResult> {
  const runtime = RUNTIMES[language];

  const request: PistonRequest = {
    language: runtime.language,
    version: runtime.version,
    files: [
      {
        name: runtime.filename,
        content: code,
      },
    ],
    run_timeout: 10000,   // 10s execution limit
    compile_timeout: 15000,
  };

  try {
    const response = await axios.post<PistonResponse>(
      `${BASE_URL}/execute`,
      request,
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { run, compile } = response.data;

    // For compiled languages (TypeScript), compile errors surface in `compile`
    let stderr = run.stderr || '';
    if (compile && compile.stderr) {
      stderr = compile.stderr + (stderr ? '\n' + stderr : '');
    }

    return {
      stdout: run.stdout || '',
      stderr,
      exitCode: run.code ?? 0,
      language,
      executedAt: Date.now(),
    };
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unknown execution error';

    return {
      stdout: '',
      stderr: `[CodeFlip] Execution error: ${message}`,
      exitCode: 1,
      language,
      executedAt: Date.now(),
    };
  }
}

export async function fetchRuntimes() {
  try {
    const response = await axios.get(`${BASE_URL}/runtimes`, { timeout: 10000 });
    return response.data as { language: string; version: string }[];
  } catch {
    return null;
  }
}
