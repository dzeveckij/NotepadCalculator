import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, Plus, ArrowRight } from 'lucide-react';

// Helper functions for parsing and calculations
const parseExpression = (input, variables) => {
  if (!input.trim()) return null;
  
  const tokens = input.toLowerCase().trim().split(/\s+/);
  
  try {
    // Handle variable assignment
    if (tokens.length === 3 && tokens[1] === '=') {
      const varName = tokens[0];
      const value = parseFloat(tokens[2]);
      if (!isNaN(value)) {
        variables[varName] = value;
        return { value, unit: '', error: null };
      } else {
        return { error: 'Invalid value for variable assignment' };
      }
    }
    // Handle currency conversions
    else if (input.includes('in') || input.includes('to')) {
      return handleConversion(tokens);
    }
    // Handle basic calculations
    else if (tokens.some(t => ['+', '-', '*', '/', 'times', 'plus', 'minus'].includes(t))) {
      return handleCalculation(tokens, variables);
    }
    // Handle percentages
    else if (input.includes('%')) {
      return handlePercentage(tokens);
    }
    // Handle simple numbers or currency
    else if (tokens.length === 1) {
      const value = parseFloat(tokens[0].replace(/[$€£]/, ''));
      const unit = tokens[0].match(/[$€£]/)?.[0] || '';
      if (!isNaN(value)) {
        return { value, unit, error: null };
      }
    }
    
    return { error: 'Invalid expression' };
  } catch (err) {
    return { error: err.message };
  }
};

const handleConversion = (tokens) => {
  const conversionIndex = tokens.findIndex(t => t === 'in' || t === 'to');
  if (conversionIndex === -1) return { error: 'Invalid conversion format' };

  const fromValue = parseFloat(tokens[0].replace(/[$€£]/, ''));
  const fromUnit = tokens[conversionIndex - 1].replace(/[$€£]/, '').toLowerCase();
  const toUnit = tokens[conversionIndex + 1].replace(/[$€£]/, '').toLowerCase();

  // Mock conversion rates (in real app, would fetch from API)
  const rates = {
    usd: { eur: 0.85, gbp: 0.73 },
    eur: { usd: 1.18, gbp: 0.86 },
    gbp: { usd: 1.37, eur: 1.16 },
    // Length conversions
    meter: { kilometer: 0.001, centimeter: 100, millimeter: 1000, inch: 39.3701, foot: 3.28084 },
    kilometer: { meter: 1000, centimeter: 100000, millimeter: 1000000, inch: 39370.1, foot: 3280.84 },
    centimeter: { meter: 0.01, kilometer: 0.00001, millimeter: 10, inch: 0.393701, foot: 0.0328084 },
    millimeter: { meter: 0.001, kilometer: 0.000001, centimeter: 0.1, inch: 0.0393701, foot: 0.00328084 },
    inch: { meter: 0.0254, kilometer: 0.0000254, centimeter: 2.54, millimeter: 25.4, foot: 0.0833333 },
    foot: { meter: 0.3048, kilometer: 0.0003048, centimeter: 30.48, millimeter: 304.8, inch: 12 },
    // Weight conversions
    kilogram: { gram: 1000, milligram: 1000000, pound: 2.20462, ounce: 35.274 },
    gram: { kilogram: 0.001, milligram: 1000, pound: 0.00220462, ounce: 0.035274 },
    milligram: { kilogram: 0.000001, gram: 0.001, pound: 0.00000220462, ounce: 0.000035274 },
    pound: { kilogram: 0.453592, gram: 453.592, milligram: 453592, ounce: 16 },
    ounce: { kilogram: 0.0283495, gram: 28.3495, milligram: 28349.5, pound: 0.0625 },
    // Volume conversions
    liter: { milliliter: 1000, cubic_meter: 0.001, gallon: 0.264172, quart: 1.05669 },
    milliliter: { liter: 0.001, cubic_meter: 0.000001, gallon: 0.000264172, quart: 0.00105669 },
    cubic_meter: { liter: 1000, milliliter: 1000000, gallon: 264.172, quart: 1056.69 },
    gallon: { liter: 3.78541, milliliter: 3785.41, cubic_meter: 0.00378541, quart: 4 },
    quart: { liter: 0.946353, milliliter: 946.353, cubic_meter: 0.000946353, gallon: 0.25 }
  };

  if (rates[fromUnit] && rates[fromUnit][toUnit]) {
    return {
      value: fromValue * rates[fromUnit][toUnit],
      unit: toUnit.toUpperCase(),
      error: null
    };
  }

  return { error: 'Unsupported conversion' };
};

const handleCalculation = (tokens, variables) => {
  let value = parseFloat(tokens[0].replace(/[$€£]/, '')) || variables[tokens[0]];
  let currentOp = null;
  let unit = tokens[0].match(/[$€£]/)?.[0] || '';

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (['+', '-', '*', '/', 'times', 'plus', 'minus'].includes(token)) {
      currentOp = token;
    } else {
      const num = parseFloat(token.replace(/[$€£]/, '')) || variables[token];
      const tokenUnit = token.match(/[$€£]/)?.[0] || '';
      if (tokenUnit && tokenUnit !== unit) {
        throw new Error('Cannot mix different currencies in calculation');
      }
      unit = unit || tokenUnit;
      
      switch (currentOp) {
        case '+':
        case 'plus':
          value += num;
          break;
        case '-':
        case 'minus':
          value -= num;
          break;
        case '*':
        case 'times':
          value *= num;
          break;
        case '/':
          if (num === 0) throw new Error('Division by zero');
          value /= num;
          break;
      }
    }
  }

  return { value, unit, error: null };
};

const handlePercentage = (tokens) => {
  const value = parseFloat(tokens[0]);
  if (tokens.includes('of')) {
    const total = parseFloat(tokens[tokens.indexOf('of') + 1].replace(/[$€£]/, ''));
    const unit = tokens[tokens.indexOf('of') + 1].match(/[$€£]/)?.[0] || '';
    return { value: (value / 100) * total, unit, error: null };
  }
  return { value: value / 100, unit: '%', error: null };
};

const CalculatorLine = ({ onCalculate, focused, onFocus, variables }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const text = e.target.value;
    setInput(text);
    const calculation = parseExpression(text, variables);
    setResult(calculation);
    if (calculation && !calculation.error) {
      onCalculate(calculation.value);
    } else {
      onCalculate(0);
    }
  };

  useEffect(() => {
    if (focused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focused]);

  return (
    <div className="flex items-center space-x-4 py-2 px-4 hover:bg-gray-800/50 rounded">
      <input
        ref={inputRef}
        className="flex-1 bg-transparent text-yellow-400 text-lg outline-none"
        value={input}
        onChange={handleChange}
        onFocus={() => onFocus()}
        placeholder="Enter calculation..."
      />
      {result && !result.error && (
        <div className="text-green-400 text-lg">
          {result.value.toFixed(2)} {result.unit}
        </div>
      )}
      {result?.error && (
        <div className="text-red-400 text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
};

const Calculator = () => {
  const [lines, setLines] = useState(['']);
  const [results, setResults] = useState([]);
  const [variables, setVariables] = useState({});
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    const text = e.target.value;
    const newLines = text.split('\n');
    setLines(newLines);
    
    // Calculate results for each line
    const newResults = newLines.map(line => 
      line.trim() ? parseExpression(line, variables) : null
    );
    setResults(newResults);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="text-gray-400">Notepad Calculator</div>
          <ChevronDown className="text-gray-400" size={20} />
        </div>
        
        {/* Calculator Content */}
        <div className="relative min-h-[400px] flex">
          {/* Main Text Area */}
          <textarea
            ref={textareaRef}
             className="w-full h-full min-h-[400px] p-4 font-mono text-md resize-none outline-none 
             bg-gray-800 text-green-400"
            value={lines.join('\n')}
            onChange={handleInput}
            spellCheck={false}
          />
          
          {/* Results Overlay */}
          <div className="absolute top-0 right-0 p-4 pointer-events-none">
            {results.map((result, index) => (
              <div 
                key={index}
                className="h-[24px] flex items-center justify-end"
              >
                {result && !result.error && (
                  <span className="text-green-600 font-mono">
                    = {result.value.toFixed(2)} {result.unit}
                  </span>
                )}
                {result?.error && (
                  <span className="text-red-500 text-sm">
                    {result.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;