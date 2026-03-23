// =============================================
// API Route — /api/automation
// Executa fluxos usando Puppeteer via processo Node.js separado
// Usa eval('require') para evitar análise estática do Turbopack
// =============================================

import { NextRequest, NextResponse } from "next/server";

interface FlowStep {
  agentId: string;
  agentName: string;
  agentUrl: string;
  action: string;
  order: number;
}

interface AutomationRequest {
  flowId: string;
  flowName: string;
  steps: FlowStep[];
  headless?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeRequire = eval("require") as (mod: string) => any;

export async function POST(request: NextRequest) {
  try {
    const body: AutomationRequest = await request.json();
    const { flowName, steps, headless = false } = body;

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma etapa no fluxo" },
        { status: 400 }
      );
    }

    const inputData = JSON.stringify({ flowName, steps, headless });

    // Carregar módulos Node.js sem passar pelo Turbopack
    const { execFile } = nodeRequire("child_process");
    const path = nodeRequire("path");

    const scriptPath = path.join(process.cwd(), "scripts", "runFlow.js");

    const result = await new Promise<string>((resolve, reject) => {
      const child = execFile("node", [scriptPath], {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      }, (error: Error | null, stdout: string, stderr: string) => {
        if (error && !stdout) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });

      if (child.stdin) {
        child.stdin.write(inputData);
        child.stdin.end();
      }
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
