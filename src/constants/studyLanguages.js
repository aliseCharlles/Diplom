/** Языки для обучения: id, отображаемое имя, иконка (devicons), язык Monaco Editor */
export const STUDY_LANGUAGES = [
  {
    id: "javascript",
    name: "JavaScript",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    monaco: "javascript",
  },
  {
    id: "typescript",
    name: "TypeScript",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    monaco: "typescript",
  },
  {
    id: "python",
    name: "Python",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    monaco: "python",
  },
  {
    id: "cpp",
    name: "C++",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    monaco: "cpp",
  },
  {
    id: "java",
    name: "Java",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    monaco: "java",
  },
  {
    id: "csharp",
    name: "C#",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
    monaco: "csharp",
  },
  {
    id: "php",
    name: "PHP",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
    monaco: "php",
  },
  {
    id: "go",
    name: "Go",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    monaco: "go",
  },
  {
    id: "rust",
    name: "Rust",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg",
    monaco: "rust",
  },
  {
    id: "swift",
    name: "Swift",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg",
    monaco: "swift",
  },
  {
    id: "kotlin",
    name: "Kotlin",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
    monaco: "kotlin",
  },
  {
    id: "ruby",
    name: "Ruby",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg",
    monaco: "ruby",
  },
];

export function getLanguageById(id) {
  return STUDY_LANGUAGES.find((l) => l.id === id) || STUDY_LANGUAGES[0];
}
