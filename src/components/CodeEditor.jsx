import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

function CodeEditor({
  code,
  setCode,
  language = "javascript",
  height = "400px",
  editorTheme = "vs",
}) {
  const [value, setValue] = useState(code);

  useEffect(() => {
    setValue(code);
  }, [code]);

  function handleChange(newValue) {
    const next = newValue ?? "";
    setValue(next);
    setCode(next);
  }

  return (
    <div className="code-editor-wrap">
      <Editor
        height={height}
        width="100%"
        language={language}
        theme={editorTheme}
        value={value}
        onChange={handleChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default CodeEditor;
