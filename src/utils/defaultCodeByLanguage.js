/** Стартовый код в редакторе по языку (подсветка Monaco; запуск в браузере — только для JS). */
export const DEFAULT_CODE_BY_LANG = {
  javascript: `function greet(name) {
  console.log("Привет, " + name + "!");
}

greet("Ученик");
`,
  typescript: `function greet(name: string): void {
  console.log(\`Привет, \${name}!\`);
}

greet("Ученик");
`,
  python: `def greet(name):
    print(f"Привет, {name}!")

greet("Ученик")
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Привет, Ученик!" << endl;
    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Привет, Ученик!");
    }
}
`,
  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Привет, Ученик!");
    }
}
`,
  php: `<?php
function greet($name) {
    echo "Привет, $name!\\n";
}

greet("Ученик");
`,
  go: `package main

import "fmt"

func main() {
	fmt.Println("Привет, Ученик!")
}
`,
  rust: `fn main() {
    println!("Привет, Ученик!");
}
`,
  swift: `func greet(_ name: String) {
    print("Привет, \\(name)!")
}

greet("Ученик")
`,
  kotlin: `fun main() {
    println("Привет, Ученик!")
}
`,
  ruby: `def greet(name)
  puts "Привет, #{name}!"
end

greet("Ученик")
`,
};

export function getDefaultCodeForLanguageId(id) {
  return DEFAULT_CODE_BY_LANG[id] || DEFAULT_CODE_BY_LANG.javascript;
}
