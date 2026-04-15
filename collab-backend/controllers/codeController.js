const { VM } = require("vm2");
const axios = require("axios");

// Judge0 CE language IDs
const LANGUAGE_IDS = {
  javascript: 63,
  python:     71,
  java:       62,
  cpp:        54,
  c:          50,
  typescript: 74,
};

// Free public Judge0 CE instance
const JUDGE0_URL = "https://ce.judge0.com";

const JUDGE0_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

// Run JavaScript locally via vm2 (fast, no external call)
const runJavaScript = (code) => {
  const output = [];
  const vm = new VM({
    timeout: 3000,
    sandbox: {
      console: {
        log: (...args) => output.push(args.map((a) => String(a)).join(" ")),
        error: (...args) => output.push(args.map((a) => String(a)).join(" ")),
      },
    },
  });
  vm.run(code);
  return output.length ? output.join("\n") : "Code executed successfully. No console output.";
};

// Judge0 compiles Java as Main.java — rename the public class to Main automatically
const normalizeJavaCode = (code) => {
  // Find "public class SomeName" and replace with "public class Main"
  return code.replace(/public\s+class\s+\w+/, "public class Main");
};

// Submit to Judge0 and poll for result
const runWithJudge0 = async (code, languageId, stdin = "") => {
  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    { source_code: code, language_id: languageId, stdin: stdin || "" },
    { headers: JUDGE0_HEADERS }
  );

  const token = submitRes.data?.token;
  if (!token) throw new Error("Failed to create Judge0 submission — no token returned");

  // Poll until done (max 15 attempts, 1.5s apart = ~22s max)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1500));

    const { data } = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { headers: JUDGE0_HEADERS }
    );

    const { status, stdout, stderr, compile_output, message } = data;

    // status.id: 1=In Queue, 2=Processing, 3=Accepted, 4+=Error/TLE/etc.
    if (!status || status.id <= 2) continue;

    // compile error (Java, C++, C, TypeScript)
    if (compile_output) return { success: false, output: compile_output.trimEnd() };

    // runtime error — stderr is still useful output (e.g. Python tracebacks)
    if (status.id !== 3) {
      const errOut = stderr || message || `Execution failed: ${status.description}`;
      return { success: false, output: errOut.trimEnd() };
    }

    // success — show stdout, fall back to stderr (some programs write to stderr normally)
    const out = stdout || stderr || "Code executed successfully. No output.";
    return { success: true, output: out.trimEnd() };
  }

  throw new Error("Execution timed out — Judge0 did not respond in time");
};

exports.runCode = async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: "Code and language are required" });
    }

    // JavaScript runs locally — instant, no external call
    if (language === "javascript") {
      const output = runJavaScript(code);
      return res.json({ success: true, output });
    }

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return res.status(400).json({ message: `Language '${language}' is not supported.` });
    }

    // Java: Judge0 compiles as Main.java, so the public class must be named Main
    const normalizedCode = language === "java" ? normalizeJavaCode(code) : code;

    const result = await runWithJudge0(normalizedCode, languageId, stdin);
    // Always return 200 — let the client decide how to display success vs error output
    return res.status(200).json(result);

  } catch (error) {
    console.error("Run code error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Code execution failed",
    });
  }
};
