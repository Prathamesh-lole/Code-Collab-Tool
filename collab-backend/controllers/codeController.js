const { VM } = require("vm2");

exports.runCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        message: "Code and language are required",
      });
    }

    if (language !== "javascript") {
      return res.status(400).json({
        message: `Language '${language}' is not supported yet. Currently only javascript is supported.`,
      });
    }

    const output = [];

    const vm = new VM({
      timeout: 3000,
      sandbox: {
        console: {
          log: (...args) => {
            output.push(args.map((arg) => String(arg)).join(" "));
          },
        },
      },
    });

    vm.run(code);

    return res.json({
      success: true,
      output: output.length ? output.join("\n") : "Code executed successfully. No console output.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Code execution failed",
    });
  }
};