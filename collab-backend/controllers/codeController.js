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

// Free public Judge0 CE instance — no API key needed
const JUDGE0_URL = "https://ce.judge0.com";

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

// Submit to Judge0 and poll for result
const runWithJudge0 = async (code, languageId, stdin = "") => {
  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    { source_code: code, language_id: languageId, stdin: stdin || "" },
    { headers: { "Content-Type": "application/json" } }
  );

  const token = submitRes.data?.token;
  if (!token) throw new Error("Failed to create Judge0 submission");

  // Poll until done (max 10 attempts, 1s apart)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const { data } = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { headers: { "Content-Type": "application/json" } }
    );

    const { status, stdout, stderr, compile_output, message } = data;

    // status.id 1=In Queue, 2=Processing, 3=Accepted, 4+=Error
    if (status.id <= 2) continue;

    if (compile_output) return { success: false, output: compile_output };
    if (stderr)         return { success: false, output: stderr };
    if (message)        return { success: false, output: message };

    return { success: true, output: stdout?.trimEnd() || "Code executed successfully. No output." };
  }

  throw new Error("Execution timed out");
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

    const result = await runWithJudge0(code, languageId, stdin);
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("Run code error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Code execution failed",
    });
  }
};
