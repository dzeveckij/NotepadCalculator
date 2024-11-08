import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { parseExpression } from '../helpers/helpers';

const Calculator = () => {
  const [lines, setLines] = useState(['']);
  const [results, setResults] = useState([]);
  const [variables, setVariables] = useState({});
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    const text = e.target.value;
    const newLines = text.split('\n');
    setLines(newLines);
    
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
        
        <div className="relative min-h-[400px] flex">
          <textarea
            ref={textareaRef}
            className="w-full h-full min-h-[400px] p-4 font-mono text-md resize-none outline-none 
            bg-gray-800 text-green-400"
            value={lines.join('\n')}
            onChange={handleInput}
            spellCheck={false}
          />
          
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