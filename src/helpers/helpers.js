export const parseExpression = (input, variables) => {
  if (!input.trim()) return null;

  const tokens = input.toLowerCase().trim().split(/\s+/);

  try {
    if (tokens.length >= 3 && tokens[1] === "=") {
      return handleVariableAssignment(tokens, variables);
    } else if (["sin", "cos", "tan"].includes(tokens[0])) {
      return handleTrigonometric(tokens);
    } else if (["log", "exp"].includes(tokens[0])) {
      return handleLogExp(tokens);
    } else if (input.includes("in") || input.includes("to")) {
      return handleConversion(tokens);
    } else if (
      tokens.some((t) =>
        ["+", "-", "*", "/", "times", "plus", "minus"].includes(t),
      )
    ) {
      return handleCalculation(tokens, variables);
    } else if (input.includes("%")) {
      return handlePercentage(tokens);
    } else if (tokens.length === 1) {
      return handleSimpleNumber(tokens[0], variables);
    }

    return { error: "Invalid expression" };
  } catch (err) {
    return { error: err.message };
  }
};

const handleVariableAssignment = (tokens, variables) => {
  const varName = tokens[0];
  const expression = tokens.slice(2).join(" ");
  const result = parseExpression(expression, variables);
  if (result && !result.error) {
    variables[varName] = result.value;
    return { value: result.value, unit: result.unit, error: null };
  } else {
    return { error: "Invalid value for variable assignment" };
  }
};

const handleConversion = (tokens) => {
  const conversionIndex = tokens.findIndex((t) => t === "in" || t === "to");
  if (conversionIndex === -1) return { error: "Invalid conversion format" };

  const fromValue = parseFloat(tokens[0].replace(/[$€£]/, ""));
  const fromUnit = tokens[conversionIndex - 1]
    .replace(/[$€£]/, "")
    .toLowerCase();
  const toUnit = tokens[conversionIndex + 1].replace(/[$€£]/, "").toLowerCase();

  const rates = {
    usd: { eur: 0.85, gbp: 0.73 },
    eur: { usd: 1.18, gbp: 0.86 },
    gbp: { usd: 1.37, eur: 1.16 },
    meter: {
      kilometer: 0.001,
      centimeter: 100,
      millimeter: 1000,
      inch: 39.3701,
      foot: 3.28084,
    },
    kilometer: {
      meter: 1000,
      centimeter: 100000,
      millimeter: 1000000,
      inch: 39370.1,
      foot: 3280.84,
    },
    centimeter: {
      meter: 0.01,
      kilometer: 0.00001,
      millimeter: 10,
      inch: 0.393701,
      foot: 0.0328084,
    },
    millimeter: {
      meter: 0.001,
      kilometer: 0.000001,
      centimeter: 0.1,
      inch: 0.0393701,
      foot: 0.00328084,
    },
    inch: {
      meter: 0.0254,
      kilometer: 0.0000254,
      centimeter: 2.54,
      millimeter: 25.4,
      foot: 0.0833333,
    },
    foot: {
      meter: 0.3048,
      kilometer: 0.0003048,
      centimeter: 30.48,
      millimeter: 304.8,
      inch: 12,
    },
    kilogram: { gram: 1000, milligram: 1000000, pound: 2.20462, ounce: 35.274 },
    gram: {
      kilogram: 0.001,
      milligram: 1000,
      pound: 0.00220462,
      ounce: 0.035274,
    },
    milligram: {
      kilogram: 0.000001,
      gram: 0.001,
      pound: 0.00000220462,
      ounce: 0.000035274,
    },
    pound: { kilogram: 0.453592, gram: 453.592, milligram: 453592, ounce: 16 },
    ounce: {
      kilogram: 0.0283495,
      gram: 28.3495,
      milligram: 28349.5,
      pound: 0.0625,
    },
    liter: {
      milliliter: 1000,
      cubic_meter: 0.001,
      gallon: 0.264172,
      quart: 1.05669,
    },
    milliliter: {
      liter: 0.001,
      cubic_meter: 0.000001,
      gallon: 0.000264172,
      quart: 0.00105669,
    },
    cubic_meter: {
      liter: 1000,
      milliliter: 1000000,
      gallon: 264.172,
      quart: 1056.69,
    },
    gallon: {
      liter: 3.78541,
      milliliter: 3785.41,
      cubic_meter: 0.00378541,
      quart: 4,
    },
    quart: {
      liter: 0.946353,
      milliliter: 946.353,
      cubic_meter: 0.000946353,
      gallon: 0.25,
    },
  };

  if (rates[fromUnit] && rates[fromUnit][toUnit]) {
    return {
      value: fromValue * rates[fromUnit][toUnit],
      unit: toUnit.toUpperCase(),
      error: null,
    };
  }

  return { error: "Unsupported conversion" };
};

const handleCalculation = (tokens, variables) => {
  let value =
    parseFloat(tokens[0].replace(/[$€£]/, "")) || variables[tokens[0]];
  let currentOp = null;
  let unit = tokens[0].match(/[$€£]/)?.[0] || "";

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (["+", "-", "*", "/", "times", "plus", "minus"].includes(token)) {
      currentOp = token;
    } else {
      const num = parseFloat(token.replace(/[$€£]/, "")) || variables[token];
      const tokenUnit = token.match(/[$€£]/)?.[0] || "";
      if (tokenUnit && tokenUnit !== unit) {
        throw new Error("Cannot mix different currencies in calculation");
      }
      unit = unit || tokenUnit;

      switch (currentOp) {
        case "+":
        case "plus":
          value += num;
          break;
        case "-":
        case "minus":
          value -= num;
          break;
        case "*":
        case "times":
          value *= num;
          break;
        case "/":
          if (num === 0) throw new Error("Division by zero");
          value /= num;
          break;
      }
    }
  }

  return { value, unit: "", error: null };
};

const handleTrigonometric = (tokens) => {
  const value = parseFloat(tokens[1]);
  if (isNaN(value))
    return { error: "Invalid value for trigonometric function" };

  let result;
  switch (tokens[0]) {
    case "sin":
      result = Math.sin(value);
      break;
    case "cos":
      result = Math.cos(value);
      break;
    case "tan":
      result = Math.tan(value);
      break;
    default:
      return { error: "Unknown trigonometric function" };
  }

  return { value: result, unit: "", error: null };
};

const handleLogExp = (tokens) => {
  const value = parseFloat(tokens[1]);
  if (isNaN(value))
    return { error: "Invalid value for logarithmic/exponential function" };

  let result;
  switch (tokens[0]) {
    case "log":
      result = Math.log(value);
      break;
    case "exp":
      result = Math.exp(value);
      break;
    default:
      return { error: "Unknown logarithmic/exponential function" };
  }

  return { value: result, unit: "", error: null };
};

const handlePercentage = (tokens) => {
  const value = parseFloat(tokens[0]);
  if (tokens.includes("of")) {
    const total = parseFloat(
      tokens[tokens.indexOf("of") + 1].replace(/[$€£]/, ""),
    );
    const unit = tokens[tokens.indexOf("of") + 1].match(/[$€£]/)?.[0] || "";
    return { value: (value / 100) * total, unit, error: null };
  }
  return { value: value / 100, unit: "%", error: null };
};

const handleSimpleNumber = (token, variables) => {
  if (variables[token] !== undefined) {
    return { value: variables[token], unit: "", error: null };
  }
  const value = parseFloat(token.replace(/[$€£]/, ""));
  const unit = token.match(/[$€£]/)?.[0] || "";
  if (!isNaN(value)) {
    return { value, unit, error: null };
  }
  return { error: "Invalid number" };
};
