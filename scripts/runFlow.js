// =============================================
// runFlow.js — Executa fluxos interagindo com agentes de IA
// Abre cada agente, digita o prompt, espera a resposta,
// captura o resultado e passa para o próximo agente
// =============================================

const puppeteer = require("puppeteer");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Detectar Chrome instalado no Windows
function getChromeExecutablePath() {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Seletores conhecidos para cada IA (input + botão enviar + área de resposta)
const AI_SELECTORS = {
  "chatgpt.com": {
    input: '#prompt-textarea, [data-testid="composer-input"], textarea',
    submit: '[data-testid="send-button"], button[aria-label="Send prompt"]',
    response: '[data-message-author-role="assistant"]',
    waitTime: 15000,
  },
  "chat.openai.com": {
    input: '#prompt-textarea, [data-testid="composer-input"], textarea',
    submit: '[data-testid="send-button"], button[aria-label="Send prompt"]',
    response: '[data-message-author-role="assistant"]',
    waitTime: 15000,
  },
  "claude.ai": {
    input: '[contenteditable="true"], .ProseMirror, textarea',
    submit: 'button[aria-label="Send Message"], button[type="submit"]',
    response: '[data-testid="assistant-message"], .font-claude-message',
    waitTime: 20000,
  },
  "gemini.google.com": {
    input: '.ql-editor, [contenteditable="true"], textarea',
    submit: 'button[aria-label="Send message"], .send-button',
    response: '.response-content, .model-response-text',
    waitTime: 15000,
  },
  "perplexity.ai": {
    input: 'textarea[placeholder], textarea',
    submit: 'button[aria-label="Submit"], button[type="submit"]',
    response: '.prose, .answer-text',
    waitTime: 20000,
  },
};

// Detectar qual IA baseado na URL
function detectAI(url) {
  for (const [domain, selectors] of Object.entries(AI_SELECTORS)) {
    if (url.includes(domain)) return selectors;
  }
  // Seletores genéricos para qualquer IA
  return {
    input: 'textarea, input[type="text"], [contenteditable="true"], [role="textbox"]',
    submit: 'button[type="submit"], button:has(svg)',
    response: ".response, .answer, .output, .result",
    waitTime: 15000,
  };
}

// Digitar texto no campo de input da IA
async function typeInInput(page, selectors, text) {
  const inputSelectors = selectors.input.split(", ");

  for (const sel of inputSelectors) {
    try {
      const element = await page.$(sel);
      if (element) {
        await element.click();
        await new Promise((r) => setTimeout(r, 500));

        // Para contenteditable (como Claude), usar keyboard
        const isContentEditable = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el && el.getAttribute("contenteditable") === "true";
        }, sel);

        if (isContentEditable) {
          await page.keyboard.type(text, { delay: 20 });
        } else {
          // Para textarea/input normal
          await element.click({ clickCount: 3 }); // selecionar tudo
          await page.keyboard.type(text, { delay: 20 });
        }
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

// Clicar no botão de enviar
async function clickSubmit(page, selectors) {
  const submitSelectors = selectors.submit.split(", ");

  for (const sel of submitSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await new Promise((r) => setTimeout(r, 500));
        await btn.click();
        return true;
      }
    } catch {
      continue;
    }
  }
  // Fallback: pressionar Enter
  await page.keyboard.press("Enter");
  return true;
}

// Esperar e capturar a resposta da IA
async function waitForResponse(page, selectors, timeout) {
  const responseSelectors = selectors.response.split(", ");

  // Esperar o tempo configurado para a IA responder
  await new Promise((r) => setTimeout(r, timeout));

  // Tentar capturar o último bloco de resposta
  for (const sel of responseSelectors) {
    try {
      const elements = await page.$$(sel);
      if (elements.length > 0) {
        // Pegar o último elemento (resposta mais recente)
        const lastElement = elements[elements.length - 1];
        const text = await page.evaluate((el) => el.innerText, lastElement);
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: capturar todo o texto visível da página
  const fullText = await page.evaluate(() => document.body.innerText);
  return fullText.slice(0, 3000);
}

async function runFlow(flowData) {
  const { flowName, steps, headless = false } = flowData;
  const results = [];
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  const chromePath = getChromeExecutablePath();
  let previousResult = "";
  let browser;

  try {
    // Abrir o browser UMA VEZ e reutilizar para todos os steps
    const launchOptions = {
      headless: headless ? "new" : false,
      defaultViewport: { width: 1280, height: 800 },
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
      // Usar um perfil dedicado ao Puppeteer (não conflita com Chrome aberto)
      const puppeteerProfile = path.join(os.homedir(), "AppData", "Local", "JarbasPuppeteer");
      launchOptions.userDataDir = puppeteerProfile;
      launchOptions.args.push(
        "--no-first-run",
        "--no-default-browser-check"
      );
    }

    browser = await puppeteer.launch(launchOptions);

    for (const step of sortedSteps) {
      try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);

        await page.goto(step.agentUrl, { waitUntil: "networkidle2" });
        await new Promise((r) => setTimeout(r, 3000));

        const aiSelectors = detectAI(step.agentUrl);

        // Montar o prompt: ação do step + resultado anterior (se houver)
        let prompt = step.action || "";
        if (previousResult && prompt) {
          prompt = prompt + "\n\n--- Contexto do agente anterior ---\n" + previousResult;
        } else if (previousResult && !prompt) {
          prompt = previousResult;
        }

        let responseText = "";

        if (prompt) {
          const typed = await typeInInput(page, aiSelectors, prompt);

          if (typed) {
            await clickSubmit(page, aiSelectors);
            responseText = await waitForResponse(page, aiSelectors, aiSelectors.waitTime);
          }
        }

        const screenshot = await page.screenshot({
          encoding: "base64",
          fullPage: false,
        });

        const title = await page.title();
        previousResult = responseText;

        results.push({
          step: step.order,
          agent: step.agentName,
          url: step.agentUrl,
          title,
          prompt: prompt.slice(0, 200),
          response: responseText.slice(0, 2000),
          screenshot: typeof screenshot === "string" ? screenshot : undefined,
          status: "success",
        });

        await page.close();
      } catch (err) {
        results.push({
          step: step.order,
          agent: step.agentName,
          url: step.agentUrl,
          title: "",
          prompt: step.action || "",
          response: "",
          status: "error",
          error: err.message || "Erro desconhecido",
        });
      }
    }
  } catch (err) {
    // Erro ao abrir o browser
    for (const step of sortedSteps) {
      results.push({
        step: step.order,
        agent: step.agentName,
        url: step.agentUrl,
        title: "",
        prompt: step.action || "",
        response: "",
        status: "error",
        error: err.message || "Erro ao abrir o navegador",
      });
    }
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  return {
    flowName,
    totalSteps: steps.length,
    completedSteps: results.filter((r) => r.status === "success").length,
    results,
  };
}

// Ler dados via stdin
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  try {
    const flowData = JSON.parse(input);
    const result = await runFlow(flowData);
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ error: err.message || "Erro ao executar fluxo" })
    );
    process.exit(1);
  }
});
