// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

async function suggestVariableName(signal: string): Promise<string | null> {
  const prompt = `
You are a variable naming assistant.
Output ONLY a valid JavaScript variable name.
No explanations. No punctuation. No spaces.

Signal: ${signal}
`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:3b",
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) return null;

  const data: any = await res.json();
  const output = data.response?.trim();

  // HARD guardrail
  if (!output || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(output)) {
    return null;
  }

  return output;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider(
    ["javascript", "typescript"],
    {
      provideCompletionItems: async (document, position) => {
        console.log("completion provider called");
        const line = document.lineAt(position).text;
        const beforeCursor = line.slice(0, position.character);

        // Only trigger at: const | let | var |
        const match = beforeCursor.match(/\b(const|let|var)\s+$/);
        if (!match) return [];

        // Extract RHS from the full line (cursor is before '=')
        const rhsMatch = line.match(/=\s*(.+)$/);
        const signal = rhsMatch ? rhsMatch[1] : "unknown value";

        const name = await suggestVariableName(signal);
        if (!name) return [];

        const item = new vscode.CompletionItem(
          name,
          vscode.CompletionItemKind.Variable,
        );

        return [item];
      },
    },
  );

  context.subscriptions.push(provider);
}
// This method is called when your extension is deactivated
export function deactivate() {}
