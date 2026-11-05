/**
 * Faculty-authored demo content for the seeded PSPP subject (CSC26103), Units 1 and 2, based on
 * the faculty's unit notes (with their typos and example errors corrected). Seeded as published
 * by the subject's faculty. Videos are public YouTube lectures, each checked to exist (title and
 * channel noted) on 2026-10-21; faculty can replace any of them in the studio.
 *
 * Python problems: the program reads stdin with input() and is graded on its printed output.
 * Expected output comes from running `solution` on each test's input.
 */

const py = (title, difficulty, prompt, starterCode, solution, tests, hints = []) => ({
  title,
  difficulty,
  language: 'python',
  prompt,
  starterCode,
  solution,
  tests: tests.map(([input, hidden = false]) => ({ input, hidden })),
  hints,
});

export const PSPP_CONTENT = {
  intro: {
    video: {
      title: 'Interpreter vs Compiler: What’s the Difference? (WhiteboardDoodles)',
      url: 'https://www.youtube.com/watch?v=ZWM-I2rRfP8',
    },
    curiosity:
      'Your friend writes a C program and must compile it before running it. You type one line of Python and it runs at once. Who is doing the translation for you?',
    curiosityQuestion: {
      stem: 'Why can Python run a line the moment you type it?',
      options: [
        'Python programs are already in machine language',
        'The Python interpreter translates and runs the code line by line',
        'Python skips translation altogether',
      ],
      correctIndex: 1,
      explanation:
        'An interpreter reads the source and executes it statement by statement, so there is no separate compile step for you to run.',
    },
    easy: 'Python is a **high-level** programming language: you write instructions in nearly plain English, like `print("Hello")`.\n\nComputers only understand machine language (0s and 1s), so a translator is needed:\n\n- A **compiler** translates the *whole program* into machine code first, then you run it (C, C++).\n- An **interpreter** reads the program *line by line* and runs each line immediately (Python).\n\nPython was created by **Guido van Rossum** (work started in December 1989) and named after the comedy show *Monty Python’s Flying Circus*. It is free, open source and runs on Windows, Linux and macOS.',
    tenMark:
      '## Introduction\nPython is a general-purpose, high-level, interpreted programming language. It was conceived in the late 1980s by Guido van Rossum at CWI, Netherlands, as a successor to the ABC language; implementation began in December 1989. The name comes from the BBC comedy series *Monty Python’s Flying Circus*.\n\n## Translators\nA program written in a high-level language must be translated into machine language.\n\n### Interpreter\n- Reads the source code and executes it **line by line**.\n- Stops at the first error and reports it, so debugging is easy.\n- No separate executable file is produced.\n- Example: Python.\n\n### Compiler\n- Translates the **entire program** into machine code before execution.\n- Reports all errors after compilation; the produced executable runs fast.\n- Example: C, C++.\n\n## Comparison\n| Interpreter | Compiler |\n|---|---|\n| Line by line | Whole program at once |\n| Slower execution | Faster execution |\n| Easier debugging | Errors listed after compiling |\n| No object file | Creates object/executable file |\n\n## Modes of Python\n- **Interactive mode:** statements run as soon as they are typed at the `>>>` prompt.\n- **Script mode:** statements are saved in a `.py` file and run together.\n\n## Conclusion\nPython’s interpreter, simple syntax and free availability make it the most common first language for engineers.',
    realWorld:
      '- **YouTube and Instagram** run large parts of their servers on Python.\n- **ISRO and NASA** scientists use Python to analyse data.\n- **Google Colab / Jupyter** let students run Python in the browser, one cell at a time (an interpreter at work).\n- **Automation:** college staff use small Python scripts to merge mark sheets and send circulars.',
    flashcards: [
      [
        'Who created Python?',
        'Guido van Rossum (implementation started in December 1989 at CWI, Netherlands).',
      ],
      ['Interpreter in one line?', 'Translates and runs a program line by line.'],
      ['Compiler in one line?', 'Translates the whole program into machine code before it runs.'],
      [
        'Why is Python called “Python”?',
        'After the BBC comedy series Monty Python’s Flying Circus.',
      ],
      ['Two modes of running Python?', 'Interactive mode (>>> prompt) and script mode (.py file).'],
    ],
    mcqs: [
      {
        stem: 'Python is mainly a(n)…',
        options: [
          'Compiled language only',
          'Interpreted language',
          'Assembly language',
          'Machine language',
        ],
        correctIndex: 1,
        explanation: 'Python code is executed by an interpreter, statement by statement.',
        optionExplanations: [
          'Python is not compiled to an executable by the programmer.',
          'Correct.',
          'Assembly is a low-level language.',
          'Machine language is binary.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which translator converts the whole program before running it?',
        options: ['Interpreter', 'Compiler', 'Editor', 'Loader'],
        correctIndex: 1,
        explanation: 'A compiler translates the entire source into machine code first.',
        optionExplanations: [
          'An interpreter works line by line.',
          'Correct.',
          'An editor only edits text.',
          'A loader loads programs into memory.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Python was developed by…',
        options: ['Dennis Ritchie', 'James Gosling', 'Guido van Rossum', 'Bjarne Stroustrup'],
        correctIndex: 2,
        explanation: 'Guido van Rossum started Python in 1989.',
        optionExplanations: [
          'Ritchie created C.',
          'Gosling created Java.',
          'Correct.',
          'Stroustrup created C++.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'An advantage of an interpreter is…',
        options: [
          'Faster execution',
          'Errors are reported line by line, which makes debugging easier',
          'It creates an .exe file',
          'It needs no source code',
        ],
        correctIndex: 1,
        explanation: 'It stops at the first error and shows where it is.',
        optionExplanations: [
          'Compiled code usually runs faster.',
          'Correct.',
          'Interpreters do not produce executables.',
          'Source code is what it reads.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Python is called a high-level language because…',
        options: [
          'It runs only on high-end machines',
          'It is close to human language and hides hardware details',
          'It is written in binary',
          'It cannot be translated',
        ],
        correctIndex: 1,
        explanation: 'High-level languages use English-like words and manage memory for you.',
        optionExplanations: [
          'It runs on ordinary computers.',
          'Correct.',
          'Binary is machine language.',
          'It is translated by the interpreter.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Welcome message',
        'easy',
        'Read a student’s **name** and print a welcome line.\n\n**Input:** one line, the name.\n\n**Output:** `Welcome to Python, <name>!`\n\nExample: input `Arun` → `Welcome to Python, Arun!`',
        'name = input()\n# print the welcome line\n',
        'name = input()\nprint("Welcome to Python, " + name + "!")',
        [['Arun'], ['Priya Dharshini', true], ['Mohamed Ali', true]],
        ['input() gives you the line the user typed.', 'Join strings with + and print once.'],
      ),
    ],
  },

  features: {
    video: {
      title:
        'Introduction to Python Programming | Compiler vs Interpreter, Bytecodes, PVM (DevOps Made Easy)',
      url: 'https://www.youtube.com/watch?v=JBwWg6dGSdg',
    },
    curiosity:
      'You write a Python program on your Windows laptop. Your friend opens the same .py file on a Linux lab computer and it runs without any change. How is that possible?',
    curiosityQuestion: {
      stem: 'Which feature lets the same Python file run on Windows and Linux?',
      options: [
        'Python is portable (platform independent)',
        'Python is compiled for every OS automatically',
        'Python only runs on Windows',
      ],
      correctIndex: 0,
      explanation:
        'Each platform has its own Python interpreter, so the same source runs everywhere.',
    },
    easy: 'Why do colleges teach Python first? Because of its **features**:\n\n- **Easy to learn and read:** simple English-like syntax.\n- **Free and open source:** download it from python.org.\n- **Portable:** the same program runs on Windows, Linux and macOS.\n- **Interpreted:** runs line by line, so errors are easy to find.\n- **High-level:** no need to manage memory yourself (automatic garbage collection).\n- **Object-oriented and procedural:** supports both styles.\n- **Extensible and integrable:** works with C, C++ and Java.\n- **Huge library:** GUI (Tkinter, PyQt), web, data science and AI.',
    tenMark:
      '## Introduction\nPython’s popularity comes from a set of features that make it simple for beginners and powerful for professionals.\n\n## Features of Python\n1. **Easy to code and read:** clean syntax with indentation instead of braces.\n2. **Free and open source:** freely downloadable from python.org; anyone can use and share it.\n3. **Portable / platform independent:** runs on Windows, Linux, macOS, Unix and more without changes.\n4. **Interpreted:** executed line by line; no separate compilation step.\n5. **High-level:** the programmer does not deal with memory or hardware details.\n6. **Automatic memory management:** garbage collection frees unused objects.\n7. **Object-oriented:** supports classes, objects, encapsulation and inheritance, as well as procedural and functional styles.\n8. **Extensible and integrated:** can be combined with C, C++, Java and other languages.\n9. **GUI programming support:** Tkinter, PyQt, wxPython.\n10. **Large standard library:** ready modules for files, maths, web, databases.\n\n## Applications\nWeb development, data science, machine learning, automation, scientific computing and education.\n\n## Conclusion\nThese features make Python a productive language for students and industry alike.',
    realWorld:
      '- **Portable:** the same mark-processing script runs on the office Windows PC and the Linux server.\n- **Libraries:** Pandas and Matplotlib turn an attendance sheet into charts in a few lines.\n- **AI and ML:** TensorFlow and PyTorch, used in face-recognition attendance systems, are Python libraries.\n- **Open source:** startups in India build products on Python without licence costs.',
    flashcards: [
      [
        'What does “portable” mean for Python?',
        'The same program runs on different operating systems without changes.',
      ],
      ['Who manages memory in Python?', 'Python itself, with automatic garbage collection.'],
      ['Name two GUI libraries for Python.', 'Tkinter and PyQt (also wxPython).'],
      ['Is Python free?', 'Yes, it is free and open source (python.org).'],
      [
        'Which programming styles does Python support?',
        'Procedural, object-oriented and functional.',
      ],
    ],
    mcqs: [
      {
        stem: 'Which is NOT a feature of Python?',
        options: ['Open source', 'Portable', 'Requires manual memory management', 'Interpreted'],
        correctIndex: 2,
        explanation: 'Python manages memory automatically with garbage collection.',
        optionExplanations: [
          'Python is open source.',
          'Python is portable.',
          'Correct: this is not a feature.',
          'Python is interpreted.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'A Python program written on Windows runs on Linux unchanged. This feature is…',
        options: ['Extensibility', 'Portability', 'Garbage collection', 'Dynamic typing'],
        correctIndex: 1,
        explanation: 'Portability means platform independence.',
        optionExplanations: [
          'Extensibility is adding C/C++ modules.',
          'Correct.',
          'That is memory management.',
          'That is about variable types.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which library is used to build GUIs in Python?',
        options: ['NumPy', 'Tkinter', 'math', 'random'],
        correctIndex: 1,
        explanation: 'Tkinter ships with Python for windows, buttons and forms.',
        optionExplanations: [
          'NumPy is for arrays.',
          'Correct.',
          'math is for maths functions.',
          'random is for random numbers.',
        ],
        difficulty: 'easy',
      },
      {
        stem: '“Python can be combined with C and C++ modules.” This is…',
        options: ['Integrated / extensible', 'Interpreted', 'Portable', 'High-level'],
        correctIndex: 0,
        explanation: 'Python can call and be extended with code in other languages.',
        optionExplanations: [
          'Correct.',
          'Interpreted is about execution.',
          'Portable is about platforms.',
          'High-level is about abstraction.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Python blocks of code are marked by…',
        options: ['Curly braces { }', 'Indentation', 'BEGIN and END', 'Semicolons'],
        correctIndex: 1,
        explanation: 'Indentation is part of Python’s syntax and keeps code readable.',
        optionExplanations: [
          'Braces are used in C/Java.',
          'Correct.',
          'That is Pascal-style.',
          'Semicolons are optional separators.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [],
  },

  execution: {
    video: {
      title: 'How to install Python | Interactive Mode & Script Mode (Codipy Mohit by LEPSES)',
      url: 'https://www.youtube.com/watch?v=5hdI90r0cNc',
    },
    curiosity:
      'You want to check what 7 ** 3 is right now, but you also need to save your lab program to submit tomorrow. Should both be done the same way?',
    curiosityQuestion: {
      stem: 'Quick check of one line vs a program to keep. Which modes fit?',
      options: [
        'Script mode for both',
        'Interactive mode for the quick check, script mode (.py file) for the program',
        'Interactive mode for both',
      ],
      correctIndex: 1,
      explanation:
        'Interactive mode gives instant results; script mode saves the whole program in a file you can run again.',
    },
    easy: 'To start, install Python from **python.org/downloads** (tick *Add Python to PATH*). It comes with **IDLE**, a simple editor.\n\nThere are two ways to run code:\n\n- **Interactive mode:** type at the `>>>` prompt and press Enter. The answer appears at once. Great for testing one line.\n- **Script mode:** write many lines in a file ending in `.py`, save it, then run it (F5 in IDLE, or `python file.py` in Command Prompt).\n\nYou can also use VS Code, Jupyter Notebook or an online Python compiler.',
    tenMark:
      '## Installation\n1. Download the latest Python 3 installer from https://www.python.org/downloads/.\n2. Run it and tick **Add Python to PATH**, then choose *Install Now*.\n3. Python comes with **IDLE** (Integrated Development and Learning Environment).\n4. Check the installation in Command Prompt: `python --version`.\n\n## Execution\nExecution means running a program so the computer processes the instructions and produces output.\n\n### 1. Interactive mode\n- Statements are typed at the `>>>` prompt and run immediately.\n- Example: `>>> print("Hello World")` → `Hello World`\n- Advantages: instant results, good for testing and learning.\n- Limitation: code is not saved.\n\n### 2. Script mode\n- Statements are written in a file with the `.py` extension and the whole file is run.\n- Example file `sum.py`:\n```python\na = 10\nb = 20\nprint("Sum =", a + b)\n```\nOutput: `Sum = 30`\n- Advantages: programs can be saved, edited and re-run.\n\n## Ways to run Python programs\nIDLE, Visual Studio Code, Command Prompt (`python filename.py`), Jupyter Notebook (cell by cell) and online compilers.\n\n## Conclusion\nUse interactive mode to experiment and script mode to build complete programs.',
    realWorld:
      '- **Lab exams:** you write and save programs in script mode (.py) so the examiner can run them.\n- **Data science:** Jupyter notebooks run code one cell at a time, like a richer interactive mode.\n- **Servers:** a Python script runs every night (`python backup.py`) to back up college records.\n- **Quick maths:** engineers use the `>>>` prompt as a powerful calculator.',
    flashcards: [
      [
        'What is IDLE?',
        'Integrated Development and Learning Environment: the editor that comes with Python.',
      ],
      ['Interactive mode?', 'Statements run immediately at the >>> prompt; nothing is saved.'],
      ['Script mode?', 'Statements are saved in a .py file and the whole file is run.'],
      ['Command to run a script from Command Prompt?', 'python filename.py'],
      ['Which checkbox matters when installing on Windows?', '“Add Python to PATH”.'],
    ],
    mcqs: [
      {
        stem: 'The Python interactive prompt looks like…',
        options: ['C:\\>', '>>>', '$', '#'],
        correctIndex: 1,
        explanation: '>>> is the Python shell prompt.',
        optionExplanations: [
          'That is the Windows command prompt.',
          'Correct.',
          'That is a Unix shell prompt.',
          'That starts a Python comment.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Python source files have the extension…',
        options: ['.pt', '.py', '.pyt', '.p'],
        correctIndex: 1,
        explanation: 'Python scripts are saved as .py files.',
        optionExplanations: [
          'Not a Python extension.',
          'Correct.',
          'Not a Python extension.',
          'Not a Python extension.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which mode is best for saving and re-running a 30-line program?',
        options: ['Interactive mode', 'Script mode', 'Debug mode', 'Safe mode'],
        correctIndex: 1,
        explanation: 'Script mode keeps the program in a file.',
        optionExplanations: [
          'Interactive code is not saved.',
          'Correct.',
          'Not one of the two execution modes.',
          'Not a Python mode.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'In IDLE, a script is run with…',
        options: ['F1', 'F5', 'Ctrl+S', 'Esc'],
        correctIndex: 1,
        explanation: 'Run → Run Module is F5.',
        optionExplanations: [
          'F1 opens help.',
          'Correct.',
          'Ctrl+S only saves.',
          'Esc does nothing here.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Which tool runs Python code one cell at a time?',
        options: ['Notepad', 'Jupyter Notebook', 'Command Prompt only', 'Paint'],
        correctIndex: 1,
        explanation: 'Jupyter executes code cell by cell and shows output below each cell.',
        optionExplanations: [
          'Notepad cannot run code.',
          'Correct.',
          'Command Prompt runs whole files.',
          'Paint is a drawing app.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Sum of two numbers',
        'easy',
        'Your first script. Read two whole numbers, **one per line**, and print their sum.\n\n**Output:** `Sum = <a+b>`\n\nExample: inputs `10` and `20` → `Sum = 30`',
        'a = int(input())\nb = int(input())\n# print the sum\n',
        'a = int(input())\nb = int(input())\nprint("Sum =", a + b)',
        [['10\n20'], ['7\n-2', true], ['100\n250', true]],
        ['print("Sum =", value) puts a space between the label and the value.'],
      ),
    ],
  },

  datatypes: {
    video: {
      title: 'Python Variables & Data Types - The Building Blocks of Code (Python Simplified)',
      url: 'https://www.youtube.com/watch?v=KeA39II7AO8',
    },
    curiosity:
      'You store a student’s age as 20 and their CGPA as 8.5. Then you add 1 to the age and get 21, but "20" + "1" gives "201". Why does the same + behave differently?',
    curiosityQuestion: {
      stem: 'Why does 20 + 1 give 21 but "20" + "1" give "201"?',
      options: [
        'Python has a bug',
        'The values have different data types: int adds, str joins',
        '+ always joins',
      ],
      correctIndex: 1,
      explanation:
        'An operation depends on the data type. Integers are added; strings are concatenated.',
    },
    easy: 'A **variable** is a name that refers to a value: `age = 20`. The `=` sign *assigns* the value.\n\nEvery value has a **data type**:\n\n| Type | Example |\n|---|---|\n| `int` | `20`, `-5` |\n| `float` | `8.5`, `3.14` |\n| `complex` | `3+5j` |\n| `bool` | `True`, `False` |\n| `str` | `"Python"` |\n| `list`, `tuple`, `dict`, `set` | collections |\n\nRules for names: start with a letter or `_`, then letters, digits or `_`; names are **case-sensitive** (`mark` and `Mark` differ); keywords like `if` or `for` cannot be used. Use `type(x)` to see a value’s type.',
    tenMark:
      '## Variables\nA variable is a name that refers to a value stored in memory. An assignment statement creates it:\n```python\nmessage = "Introducing Python Variable"\nnum = 15\nradius = 5.4\n```\n\n### Rules for variable names\n- Must start with a letter or an underscore (`_mark`, `mark_`).\n- The rest may contain letters, digits and underscores (`subject1`, `my2ndsubject`).\n- Names are case-sensitive (`total`, `Total`, `TOTAL` are different).\n- Keywords (`if`, `else`, `for`, `while`, `True` …) cannot be used.\n\n## Data types\nA data type tells what kind of value a variable holds and which operations are allowed.\n\n| Category | Types |\n|---|---|\n| Numeric | `int`, `float`, `complex` |\n| Boolean | `bool` |\n| Text | `str` |\n| Sequence | `list`, `tuple`, `range` |\n| Mapping | `dict` |\n| Set | `set`, `frozenset` |\n| Binary | `bytes`, `bytearray`, `memoryview` |\n\n### Examples\n```python\nx = 3 + 5j\nprint(type(x))      # <class \'complex\'>\na = True\nb = 30 > 45         # False\n```\n\n### Boolean operators\n`True and False` → False; `False or True` → True; `not (3 > 4)` → True.\n\n## Dynamic typing\nPython decides the type at run time; the same name can later refer to a value of another type.\n\n## Conclusion\nChoosing the right data type avoids errors and makes programs correct.',
    realWorld:
      '- **Student record:** name (`str`), age (`int`), CGPA (`float`), hosteller (`bool`).\n- **Shopping cart:** a `list` of items and a `dict` of item → price.\n- **Electrical engineering:** impedance is a `complex` number like `3+4j`.\n- **Attendance:** a `set` of roll numbers present today removes duplicates automatically.',
    flashcards: [
      ['What is a variable?', 'A name that refers to a value stored in memory.'],
      ['Three numeric types in Python?', 'int, float and complex.'],
      [
        'Can a variable name start with a digit?',
        'No. It must start with a letter or an underscore.',
      ],
      ['How do you find a value’s type?', 'type(value), e.g. type(8.5) is float.'],
      ['Values of bool?', 'True and False.'],
    ],
    mcqs: [
      {
        stem: 'Which is a valid variable name?',
        options: ['2ndmark', '_mark', 'my-mark', 'for'],
        correctIndex: 1,
        explanation:
          'Names may start with an underscore and contain letters, digits and underscores.',
        optionExplanations: [
          'Cannot start with a digit.',
          'Correct.',
          'Hyphens are not allowed.',
          '`for` is a keyword.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'type(3+5j) is…',
        options: ['int', 'float', 'complex', 'str'],
        correctIndex: 2,
        explanation: 'j marks the imaginary part of a complex number.',
        optionExplanations: [
          'No imaginary part allowed in int.',
          'float has no imaginary part.',
          'Correct.',
          'There are no quotes.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'b = 30 > 45. What is b?',
        options: ['30', '45', 'True', 'False'],
        correctIndex: 3,
        explanation: 'The comparison is evaluated to a bool: 30 is not greater than 45.',
        optionExplanations: [
          'b holds the result of the comparison.',
          'Same reason.',
          '30 > 45 is not true.',
          'Correct.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Python variable names are…',
        options: [
          'Case-insensitive',
          'Case-sensitive',
          'Always upper case',
          'Limited to 8 characters',
        ],
        correctIndex: 1,
        explanation: '`mark` and `Mark` are two different variables.',
        optionExplanations: [
          'They are case-sensitive.',
          'Correct.',
          'Any case is allowed.',
          'They can be any reasonable length.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which type is a mapping type?',
        options: ['list', 'tuple', 'dict', 'set'],
        correctIndex: 2,
        explanation: 'A dict maps keys to values.',
        optionExplanations: [
          'A list is a sequence.',
          'A tuple is a sequence.',
          'Correct.',
          'A set is an unordered collection.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      py(
        'Student card',
        'easy',
        'Read a student’s **name**, **age** (whole number) and **CGPA** (decimal), one per line, and print:\n\n```\nName: <name>\nAge next year: <age + 1>\nCGPA: <cgpa>\n```\n\nThe CGPA is printed as a float, so `9` becomes `9.0`.',
        'name = input()\nage = int(input())\ncgpa = float(input())\n# print the three lines\n',
        'name = input()\nage = int(input())\ncgpa = float(input())\nprint("Name:", name)\nprint("Age next year:", age + 1)\nprint("CGPA:", cgpa)',
        [['Aarthi\n18\n8.5'], ['Bharath\n19\n9', true], ['Divya\n17\n7.25', true]],
        ['int() and float() turn the typed text into numbers.', 'print("Age next year:", age + 1)'],
      ),
    ],
  },

  io: {
    video: {
      title:
        'Python Tutorial for Beginners 5 - Python print() and input() Function (ProgrammingKnowledge)',
      url: 'https://www.youtube.com/watch?v=AovxLr8jUH4',
    },
    curiosity:
      'A program asks “Enter your marks:” and you type 90. Then it says “You scored 90”. How did the program get your number, and how did it show it back?',
    curiosityQuestion: {
      stem: 'What does input() return when you type 90?',
      options: ['The integer 90', 'The string "90"', 'The float 90.0'],
      correctIndex: 1,
      explanation: 'input() always returns a str. Convert it with int() or float() to calculate.',
    },
    easy: 'Programs talk to users with two functions:\n\n- **`input("prompt")`** reads what the user types, *always as a string*.\n- **`print(...)`** shows values on the screen.\n\n```python\nname = input("Enter your name: ")\nprint("Welcome", name)\n```\n\nUseful tricks:\n- `print("a", "b")` puts a space between items; `sep="-"` changes it.\n- `print("*", end=" ")` stays on the same line.\n- Read two numbers on one line: `a, b = map(int, input().split())`.',
    tenMark:
      '## Introduction\nInput and output statements let a program communicate with the user. Python uses `input()` to read data and `print()` to display results.\n\n## Output statement: print()\nSyntax: `print(value1, value2, ..., sep=" ", end="\\n")`\n```python\nprint("Welcome to Python Programming")\nname = "Ravi"; age = 20\nprint(name, age)          # Ravi 20\nprint(10 + 20)            # 30\n```\n- `sep` sets the separator between values (default a space).\n- `end` sets what is printed at the end (default a newline).\n\n## Input statement: input()\nSyntax: `variable = input("prompt")`\n- Displays the prompt and waits for the user.\n- Returns what was typed as a **string**.\n```python\na = int(input("Enter the first number: "))\nb = int(input("Enter the second number: "))\nprint("Sum =", a + b)\n```\n\n## Multiple values in one line\n```python\na, b = map(int, input("Enter two numbers: ").split())\nprint("Sum =", a + b)\n```\n`split()` breaks the line at spaces; `map(int, ...)` converts each part.\n\n## Example: area of a rectangle\n```python\nlength = float(input("Enter the length: "))\nbreadth = float(input("Enter the breadth: "))\nprint("Area of rectangle =", length * breadth)\n```\nInput 5 and 4 → `Area of rectangle = 20.0`\n\n## Conclusion\nWith input() and print() (and type conversion), programs become interactive.',
    realWorld:
      '- **ATM:** asks for your PIN and amount (input) and shows the balance (output).\n- **College admission form:** every field you type is input; the confirmation slip is output.\n- **Billing counter:** the cashier enters quantities; the bill is printed.\n- **Competitive coding sites** read test data with input() and check what you print.',
    flashcards: [
      ['What type does input() return?', 'Always a string (str).'],
      ['How do you read two integers on one line?', 'a, b = map(int, input().split())'],
      [
        'What does end=" " do in print()?',
        'Prints a space instead of a newline, so the next output stays on the same line.',
      ],
      ['Default separator in print("a", "b")?', 'A single space.'],
      ['How do you read a decimal number?', 'x = float(input())'],
    ],
    mcqs: [
      {
        stem: 'x = input() and the user types 25. type(x) is…',
        options: ['int', 'float', 'str', 'bool'],
        correctIndex: 2,
        explanation: 'input() returns text; convert it to use it as a number.',
        optionExplanations: [
          'Needs int(input()).',
          'Needs float(input()).',
          'Correct.',
          'Not a boolean.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Output of print("A", "B", sep="-")?',
        options: ['A B', 'A-B', 'AB', 'A - B'],
        correctIndex: 1,
        explanation: 'sep replaces the default space between values.',
        optionExplanations: [
          'That is the default separator.',
          'Correct.',
          'That would be sep="".',
          'sep is exactly "-" with no spaces.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'print("Hi", end="") followed by print("There") prints…',
        options: ['Hi There', 'HiThere', 'Hi\\nThere', 'Error'],
        correctIndex: 1,
        explanation: 'end="" removes the newline and adds nothing.',
        optionExplanations: [
          'end is empty, not a space.',
          'Correct.',
          'The newline was replaced.',
          'This is valid code.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'a, b = input().split() with input "10 20" gives a + b =…',
        options: ['30', '1020', 'Error', '10 20'],
        correctIndex: 1,
        explanation: 'Both parts are strings, so + joins them.',
        optionExplanations: [
          'Needs map(int, ...).',
          'Correct.',
          'Joining strings is allowed.',
          'There is no space after joining.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Which function displays output on the screen?',
        options: ['input()', 'print()', 'type()', 'int()'],
        correctIndex: 1,
        explanation: 'print() writes values to the screen.',
        optionExplanations: [
          'input() reads.',
          'Correct.',
          'type() returns a type.',
          'int() converts.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Area of a rectangle',
        'easy',
        'Read the **length** and **breadth** (decimals, one per line) and print the area.\n\n**Output:** `Area of rectangle = <area>`\n\nExample: `5` and `4` → `Area of rectangle = 20.0`',
        'length = float(input())\nbreadth = float(input())\n# print the area\n',
        'length = float(input())\nbreadth = float(input())\nprint("Area of rectangle =", length * breadth)',
        [['5\n4'], ['2.5\n4', true], ['12\n0.5', true]],
        ['Area = length * breadth.'],
      ),
      py(
        'Two numbers on one line',
        'easy',
        'Read **two whole numbers on one line**, separated by a space, and print their sum and product on two lines:\n\n```\nSum = <a+b>\nProduct = <a*b>\n```',
        'a, b = map(int, input().split())\n',
        'a, b = map(int, input().split())\nprint("Sum =", a + b)\nprint("Product =", a * b)',
        [['10 20'], ['-3 7', true], ['0 99', true]],
        ['map(int, input().split()) gives two integers.'],
      ),
    ],
  },

  operators: {
    video: {
      title:
        'OPERATORS in Python (Arithmetic, Assignment, Comparison, Logical, Bitwise, Identity, Membership) (Digital Academy)',
      url: 'https://www.youtube.com/watch?v=-wDaVLkKOiU',
    },
    curiosity:
      '17 students must be split into teams of 5. How many full teams can you make, and how many students are left over? Python can answer both with one operator each.',
    curiosityQuestion: {
      stem: 'Which operators give the full teams and the leftover students for 17 and 5?',
      options: ['/ and *', '// and %', '** and -', '+ and /'],
      correctIndex: 1,
      explanation: '17 // 5 = 3 full teams (floor division) and 17 % 5 = 2 left over (remainder).',
    },
    easy: 'An **operator** is a symbol that does work on values; an **expression** combines values and operators into a result: `(5 + 3) * 2` → `16`.\n\n| Kind | Operators | Example |\n|---|---|---|\n| Arithmetic | `+ - * / % // **` | `10 // 3` → `3` |\n| Comparison | `== != > < >= <=` | `10 > 5` → `True` |\n| Logical | `and or not` | `age >= 18 and age <= 60` |\n| Assignment | `= += -= *= /= %=` | `x += 5` |\n| Bitwise | `& \\| ^ ~ << >>` | `5 & 3` → `1` |\n| Membership | `in`, `not in` | `"apple" in fruits` |\n| Identity | `is`, `is not` | `a is b` |\n\nNote: `/` always gives a float (`10 / 5` → `2.0`); `//` drops the fractional part.',
    tenMark:
      '## Introduction\nOperators are special symbols or keywords that perform operations on operands. An expression is a combination of values, variables and operators that produces a result.\n\n## Types of operators\n### 1. Arithmetic\n| Op | Meaning | Example | Result |\n|---|---|---|---|\n| + | Addition | 10 + 5 | 15 |\n| - | Subtraction | 10 - 5 | 5 |\n| * | Multiplication | 10 * 5 | 50 |\n| / | Division | 10 / 5 | 2.0 |\n| % | Modulus | 10 % 3 | 1 |\n| // | Floor division | 10 // 3 | 3 |\n| ** | Exponent | 2 ** 3 | 8 |\n\n### 2. Comparison (relational)\n`==, !=, >, <, >=, <=` return True or False.\n\n### 3. Logical\n`and` (both true), `or` (at least one true), `not` (reverses).\n\n### 4. Assignment\n`x = 10; x += 5` → 15; `x *= 2` → 30.\n\n### 5. Bitwise\nWork on binary bits: with a = 5 (101), b = 3 (011): `a & b` = 1, `a | b` = 7, `a ^ b` = 6, `a << 1` = 10, `a >> 1` = 2.\n\n### 6. Membership\n`"apple" in ["apple", "banana"]` → True.\n\n### 7. Identity\n`a is b` is True only if both names refer to the same object; `==` compares values.\n\n## Expressions\nArithmetic (`a + b * 2`), comparison (`a > b`), logical (`a > 5 and b < 10`), string (`"Hello" + " Python"`) and conditional (`"Pass" if mark >= 40 else "Fail"`).\n\n## Precedence\n`**` → unary `-` → `* / // %` → `+ -` → comparisons → `not` → `and` → `or`. Parentheses override precedence.\n\n## Conclusion\nOperators are the building blocks of every calculation and decision in a program.',
    realWorld:
      '- **Timetable:** 125 minutes = `125 // 60` hours and `125 % 60` minutes.\n- **Eligibility check:** `age >= 18 and has_id` decides who can vote.\n- **Even/odd roll numbers:** `roll % 2 == 0` splits a class into two lab batches.\n- **Search:** `"python" in course_list` checks if a student registered for a course.',
    flashcards: [
      ['10 / 4 in Python 3?', '2.5 (/ always gives a float).'],
      ['10 // 4?', '2 (floor division).'],
      ['10 % 4?', '2 (remainder).'],
      [
        'Difference between == and is?',
        '== compares values; is checks if both refer to the same object.',
      ],
      ['2 ** 3?', '8 (exponentiation).'],
    ],
    mcqs: [
      {
        stem: 'Value of 17 % 5?',
        options: ['3', '2', '3.4', '0'],
        correctIndex: 1,
        explanation: '17 = 5 × 3 + 2, so the remainder is 2.',
        optionExplanations: [
          'That is 17 // 5.',
          'Correct.',
          'That is 17 / 5.',
          '5 does not divide 17 exactly.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Value of 2 + 3 * 4?',
        options: ['20', '14', '24', '9'],
        correctIndex: 1,
        explanation: '* is done before +: 3 * 4 = 12, then 2 + 12.',
        optionExplanations: [
          'That is (2 + 3) * 4.',
          'Correct.',
          'Not a possible result.',
          'Not a possible result.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'age = 20. Value of age >= 18 and age <= 60?',
        options: ['True', 'False', '20', 'Error'],
        correctIndex: 0,
        explanation: 'Both comparisons are True, so and gives True.',
        optionExplanations: [
          'Correct.',
          'Both parts are True.',
          'and returns a boolean here.',
          'Valid expression.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Value of 5 & 3?',
        options: ['8', '1', '7', '2'],
        correctIndex: 1,
        explanation: '101 & 011 = 001.',
        optionExplanations: ['That is 5 + 3.', 'Correct.', 'That is 5 | 3.', 'That is 5 >> 1.'],
        difficulty: 'medium',
      },
      {
        stem: 'a = [1, 2]; b = a; c = [1, 2]. Which is True?',
        options: ['a is c', 'a is b', 'a is not b', 'b is c'],
        correctIndex: 1,
        explanation:
          'b refers to the same list object as a; c is a different object with equal values.',
        optionExplanations: [
          'Equal values, different objects.',
          'Correct.',
          'They are the same object.',
          'Different objects.',
        ],
        difficulty: 'hard',
      },
    ],
    challenges: [
      py(
        'Teams and leftovers',
        'easy',
        'Read the number of **students** and the **team size** (one per line). Print how many full teams can be formed and how many students are left:\n\n```\nTeams = <teams>\nLeft = <left>\n```\n\nExample: `17` and `5` → `Teams = 3`, `Left = 2`',
        'students = int(input())\nsize = int(input())\n',
        'students = int(input())\nsize = int(input())\nprint("Teams =", students // size)\nprint("Left =", students % size)',
        [['17\n5'], ['60\n6', true], ['4\n9', true]],
        ['Floor division // gives whole teams.', 'Modulus % gives the remainder.'],
      ),
      py(
        'Hours and minutes',
        'easy',
        'Read a duration in **minutes** and print it as hours and minutes: `<h> hours <m> minutes`.\n\nExample: `125` → `2 hours 5 minutes`',
        'total = int(input())\n',
        'total = int(input())\nprint(total // 60, "hours", total % 60, "minutes")',
        [['125'], ['59', true], ['600', true]],
        ['There are 60 minutes in an hour.'],
      ),
    ],
  },

  typeconv: {
    video: {
      title: 'Input & Type Conversion - Python for Beginners (rory mulcahey)',
      url: 'https://www.youtube.com/watch?v=8T14Q1LDDwk',
    },
    curiosity:
      'A program reads two marks with input() and prints their total. You type 80 and 90 and it prints 8090. What went wrong?',
    curiosityQuestion: {
      stem: 'How do you fix “80” + “90” becoming “8090”?',
      options: [
        'Use * instead of +',
        'Convert the inputs with int() or float() before adding',
        'Print them separately',
      ],
      correctIndex: 1,
      explanation:
        'input() returns strings, and + joins strings. Explicit conversion makes them numbers.',
    },
    easy: '**Type conversion** changes a value from one data type to another.\n\n- **Implicit** (automatic): Python converts for you when it is safe. `10 + 2.5` → `12.5` (int becomes float).\n- **Explicit** (type casting): you convert using built-in functions:\n\n| Function | Example | Result |\n|---|---|---|\n| `int()` | `int(5.8)` | `5` (cuts, does not round) |\n| `float()` | `float(10)` | `10.0` |\n| `str()` | `str(100)` | `"100"` |\n| `bool()` | `bool(0)`, `bool("")` | `False` |\n| `list()` | `list("abc")` | `[\'a\', \'b\', \'c\']` |\n| `tuple()`, `set()` | `set([1, 2, 2])` | `{1, 2}` |\n\nMost common use: `int(input())`.',
    tenMark:
      '## Definition\nType conversion is the process of converting a value from one data type to another. It is needed when doing calculations on user input or mixing types.\n\n## 1. Implicit type conversion\nPython converts automatically, without data loss.\n```python\na = 10\nb = 2.5\nc = a + b\nprint(c, type(c))   # 12.5 <class \'float\'>\n```\nThe int is promoted to float so no precision is lost.\n\n## 2. Explicit type conversion (type casting)\nThe programmer converts using built-in functions.\n| Function | Converts to | Example |\n|---|---|---|\n| int() | integer | int(15.9) → 15 |\n| float() | float | float(25) → 25.0 |\n| str() | string | str(20) → "20" |\n| bool() | boolean | bool(1) → True, bool("") → False |\n| list() | list | list("abc") → [\'a\', \'b\', \'c\'] |\n| tuple() | tuple | tuple([1, 2]) → (1, 2) |\n| set() | set | set([1, 2, 2]) → {1, 2} |\n\n### Example\n```python\na = float(input("Enter the first mark: "))\nb = float(input("Enter the second mark: "))\nprint("Average =", (a + b) / 2)\n```\nInput 80 and 90 → `Average = 85.0`\n\n## Points to remember\n- `int()` truncates towards zero: `int(15.9)` is 15.\n- `int("12.5")` raises ValueError; use `float()` first.\n- Empty or zero values convert to False with bool().\n\n## Conclusion\nType conversion makes input usable for calculation and avoids type errors.',
    realWorld:
      '- **Every form:** marks, ages and amounts typed into a website arrive as text and are converted to numbers.\n- **Reports:** numbers are converted with str() to build messages like "Total: " + str(total).\n- **CSV files:** values read from Excel exports are strings until converted.\n- **Sensors:** IoT readings arrive as text like "36.6" and are converted to float to compare.',
    flashcards: [
      [
        'Implicit vs explicit conversion?',
        'Implicit is automatic by Python; explicit is done by the programmer with int(), float(), str() and so on.',
      ],
      ['int(9.99)?', '9 (it truncates, it does not round).'],
      ['bool("")?', 'False (empty string).'],
      ['float(7)?', '7.0'],
      ['Why int(input())?', 'input() returns a string; int() makes it a number.'],
    ],
    mcqs: [
      {
        stem: 'Result of int(15.9)?',
        options: ['16', '15', '15.9', 'Error'],
        correctIndex: 1,
        explanation: 'int() removes the fractional part.',
        optionExplanations: [
          'int() does not round.',
          'Correct.',
          'That is a float.',
          'Converting a float to int is allowed.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'type(10 + 2.5) is…',
        options: ['int', 'float', 'str', 'complex'],
        correctIndex: 1,
        explanation: 'Implicit conversion promotes int to float.',
        optionExplanations: [
          'The result has a fraction.',
          'Correct.',
          'No strings involved.',
          'No imaginary part.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which gives False?',
        options: ['bool(1)', 'bool("Python")', 'bool(0)', 'bool(-1)'],
        correctIndex: 2,
        explanation: 'Zero, empty strings and empty collections are False.',
        optionExplanations: [
          'Non-zero is True.',
          'A non-empty string is True.',
          'Correct.',
          'Non-zero is True.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'set([1, 2, 2, 3]) gives…',
        options: ['[1, 2, 2, 3]', '{1, 2, 3}', '(1, 2, 3)', '{1, 2, 2, 3}'],
        correctIndex: 1,
        explanation: 'A set keeps each value once.',
        optionExplanations: [
          'That is a list.',
          'Correct.',
          'That is a tuple.',
          'Sets drop duplicates.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'int("12.5") gives…',
        options: ['12', '12.5', '13', 'ValueError'],
        correctIndex: 3,
        explanation: 'int() cannot parse a string with a decimal point; use int(float("12.5")).',
        optionExplanations: [
          'That needs float() first.',
          'That is a float.',
          'int() never rounds.',
          'Correct.',
        ],
        difficulty: 'hard',
      },
    ],
    challenges: [
      py(
        'Average of two marks',
        'easy',
        'Read two marks (they may have decimals), one per line, and print their average.\n\n**Output:** `Average = <average>`\n\nExample: `80` and `90` → `Average = 85.0`',
        'a = input()\nb = input()\n# convert, then average\n',
        'a = float(input())\nb = float(input())\nprint("Average =", (a + b) / 2)',
        [['80\n90'], ['75.5\n60', true], ['100\n0', true]],
        ['input() gives text; use float().', 'Average = (a + b) / 2'],
      ),
    ],
  },

  conditionals: {
    video: {
      title: 'Python If Else Conditional Statements Tutorial for Beginners (ProgramsAndMe)',
      url: 'https://www.youtube.com/watch?v=cslhCYkZt5Y',
    },
    curiosity:
      'Your result app shows “Pass” for 50 and above and “Fail” below 50. Then the college adds grades: O, A+, A, B… How does one program choose the right message for every mark?',
    curiosityQuestion: {
      stem: 'To print a different grade for each mark range, which statement fits best?',
      options: [
        'Many separate if statements with no else',
        'An if-elif-else ladder',
        'A single print()',
      ],
      correctIndex: 1,
      explanation:
        'An if-elif-else ladder checks conditions from top to bottom and runs only the first block that is True.',
    },
    easy: '**Conditional statements** let a program choose what to do.\n\n```python\nif mark >= 50:\n    print("Pass")\nelse:\n    print("Fail")\n```\n\n- **if:** run a block only when the condition is True.\n- **if-else:** one block when True, another when False.\n- **if-elif-else:** check several conditions in order; only the **first** True block runs.\n- **nested if:** an if inside another if.\n\nRemember the **colon** `:` and the **indentation** (4 spaces) that marks the block.',
    tenMark:
      '## Introduction\nConditional statements make decisions: they execute different blocks depending on whether a condition is True or False.\n\n## 1. if statement\n```python\nif condition:\n    statements\n```\nThe block runs only if the condition is True.\n```python\ni = 20\nif i > 15:\n    print("i is greater than 15")\nprint("I am not in if")\n```\n\n## 2. if-else (alternative)\n```python\nif mark >= 50:\n    print("Pass")\nelse:\n    print("Fail")\n```\n\n## 3. if-elif-else (chained)\nConditions are tested from the top; the first True block runs and the rest are skipped. If none is True, else runs.\n```python\ni = 20\nif i == 10:\n    print("i is 10")\nelif i == 15:\n    print("i is 15")\nelif i == 20:\n    print("i is 20")\nelse:\n    print("i is not present")\n```\n\n## 4. Nested if\n```python\ni = 10\nif i == 10:\n    if i < 15:\n        print("i is smaller than 15")\n    if i < 12:\n        print("i is smaller than 12 too")\n    else:\n        print("i is greater than 15")\n```\n\n## Flowchart\nTest expression → True → body of if; False → body of else (or skip) → statement after the if.\n\n## Conclusion\nDecision making lets programs respond differently to different data.',
    realWorld:
      '- **Exam result:** if-elif-else turns marks into grades O, A+, A, B, C or RA.\n- **ATM:** if the balance is enough, dispense cash; else show “Insufficient balance”.\n- **Login:** nested if checks the username first, then the password.\n- **Electricity bill:** different rates for 0–100, 101–200 and above-200 units.',
    flashcards: [
      ['What ends an if line in Python?', 'A colon (:), followed by an indented block.'],
      ['In if-elif-else, how many blocks run?', 'Only one: the first True condition (or else).'],
      ['What is a nested if?', 'An if statement inside another if statement.'],
      ['What marks a block in Python?', 'Indentation (usually 4 spaces).'],
      ['Conditional expression form?', '"Pass" if mark >= 50 else "Fail"'],
    ],
    mcqs: [
      {
        stem: 'mark = 72. if mark >= 90: "O" elif mark >= 70: "A" elif mark >= 50: "B". Output?',
        options: ['O', 'A', 'B', 'A and B'],
        correctIndex: 1,
        explanation: 'The first True condition (72 >= 70) wins and the rest are skipped.',
        optionExplanations: [
          '72 is not >= 90.',
          'Correct.',
          'Never reached.',
          'Only one branch runs.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'What is missing in: if x > 5 print(x)',
        options: ['Brackets', 'A colon and an indented block', 'A semicolon', 'Nothing'],
        correctIndex: 1,
        explanation: 'The correct form is if x > 5: followed by an indented print(x).',
        optionExplanations: [
          'Brackets are optional.',
          'Correct.',
          'Not needed.',
          'This is a SyntaxError.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which keyword means “else if” in Python?',
        options: ['elseif', 'elif', 'else if', 'ifelse'],
        correctIndex: 1,
        explanation: 'Python uses elif.',
        optionExplanations: [
          'Not a keyword.',
          'Correct.',
          'Not valid on one line.',
          'Not a keyword.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'x = 5. Output of: if x > 2: if x > 8: print("A") else: print("B")',
        options: ['A', 'B', 'Nothing', 'A B'],
        correctIndex: 1,
        explanation: 'The outer condition is True; the inner one is False, so the inner else runs.',
        optionExplanations: [
          '5 is not > 8.',
          'Correct.',
          'The inner else prints.',
          'Only one inner branch runs.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'result = "Even" if 7 % 2 == 0 else "Odd". result is…',
        options: ['Even', 'Odd', 'True', 'Error'],
        correctIndex: 1,
        explanation: '7 % 2 is 1, so the condition is False.',
        optionExplanations: [
          '7 is odd.',
          'Correct.',
          'The expression gives a string.',
          'Valid conditional expression.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      py(
        'Pass or fail',
        'easy',
        'Read a mark (whole number). Print `Pass` if it is **50 or above**, otherwise `Fail`.',
        'mark = int(input())\n',
        'mark = int(input())\nif mark >= 50:\n    print("Pass")\nelse:\n    print("Fail")',
        [['72'], ['50', true], ['49', true], ['0', true]],
        ['Use >= so that exactly 50 passes.'],
      ),
      py(
        'Grade calculator',
        'medium',
        'Read a mark from 0 to 100 and print the grade:\n\n| Mark | Grade |\n|---|---|\n| 90 and above | O |\n| 75–89 | A |\n| 60–74 | B |\n| 50–59 | C |\n| below 50 | RA |',
        'mark = int(input())\n',
        'mark = int(input())\nif mark >= 90:\n    print("O")\nelif mark >= 75:\n    print("A")\nelif mark >= 60:\n    print("B")\nelif mark >= 50:\n    print("C")\nelse:\n    print("RA")',
        [['82'], ['90', true], ['74', true], ['50', true], ['12', true]],
        ['Check the highest range first with if, then elif downwards.'],
      ),
      py(
        'Largest of three',
        'medium',
        'Read three whole numbers, one per line, and print the **largest**. Do not use max().',
        'a = int(input())\nb = int(input())\nc = int(input())\n',
        'a = int(input())\nb = int(input())\nc = int(input())\nif a >= b and a >= c:\n    print(a)\nelif b >= c:\n    print(b)\nelse:\n    print(c)',
        [['4\n9\n2'], ['7\n7\n3', true], ['-1\n-5\n-2', true], ['1\n2\n3', true]],
        ['a is largest if a >= b and a >= c.'],
      ),
    ],
  },

  whileloop: {
    video: {
      title: 'Python While Loops & For Loops | Python tutorial for Beginners (Dave Gray)',
      url: 'https://www.youtube.com/watch?v=23vCap6iYSs',
    },
    curiosity:
      'An ATM keeps asking for your PIN until you get it right (or it blocks after 3 tries). How does a program repeat something when it doesn’t know in advance how many times?',
    curiosityQuestion: {
      stem: 'Which loop repeats “until a condition becomes False”?',
      options: ['while loop', 'if statement', 'print()'],
      correctIndex: 0,
      explanation:
        'A while loop checks its condition before every pass and stops when it is False.',
    },
    easy: 'A **while loop** repeats a block **as long as a condition is True**.\n\n```python\ncount = 0\nwhile count < 3:\n    print("The count is:", count)\n    count = count + 1\nprint("The End")\n```\n\n- The condition is tested **before** each pass, so it is an **entry-controlled** loop.\n- Something inside must change the condition (here `count` grows), or the loop never ends: an **infinite loop**.\n- Use it when you don’t know how many repetitions you need (reading until 0, guessing games, digits of a number).',
    tenMark:
      '## Definition\nA while loop executes a block of statements repeatedly as long as a given condition is True. The condition is tested before each iteration, so it is an **entry-controlled loop**.\n\n## Syntax\n```python\nwhile condition:\n    statements\n```\n\n## Flowchart\nEnter → test condition → True: body, back to test → False: exit loop.\n\n## Example\n```python\ncount = 0\nwhile count < 9:\n    print("The count is:", count)\n    count = count + 1\nprint("The End")\n```\nOutput: The count is: 0 … The count is: 8, then The End.\n\n## Example: sum of digits\n```python\nn = 1234\ntotal = 0\nwhile n > 0:\n    total += n % 10\n    n //= 10\nprint(total)    # 10\n```\n\n## Infinite loop\nIf the condition never becomes False (for example `while True:` without break), the loop runs forever.\n\n## while vs for\n- while: the number of repetitions is not known in advance.\n- for: iterates over a known sequence or range.\n\n## Conclusion\nThe while loop is the general-purpose loop for repeating until something happens.',
    realWorld:
      '- **ATM / login:** keep asking for the PIN while it is wrong and attempts < 3.\n- **Games:** the game loop runs while the player is alive.\n- **Billing:** keep adding items while the cashier doesn’t press 0.\n- **Sensors:** keep reading temperature while the machine is on.',
    flashcards: [
      ['Why is while called entry-controlled?', 'The condition is checked before the body runs.'],
      ['What causes an infinite loop?', 'A condition that never becomes False.'],
      ['When to prefer while over for?', 'When the number of repetitions is not known in advance.'],
      ['Sum of digits step?', 'total += n % 10; n //= 10'],
      ['Does Python have do-while?', 'No. Use while True with break instead.'],
    ],
    mcqs: [
      {
        stem: 'How many times does this print? i = 1; while i <= 5: print(i); i += 2',
        options: ['5', '3', '2', 'Forever'],
        correctIndex: 1,
        explanation: 'i takes 1, 3, 5, then 7 stops the loop.',
        optionExplanations: [
          'i grows by 2.',
          'Correct.',
          '5 is also printed.',
          'i changes each pass.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'i = 10; while i > 0: print(i). What happens?',
        options: ['Prints 10 once', 'Prints 10 to 1', 'Infinite loop', 'Error'],
        correctIndex: 2,
        explanation: 'i never changes, so i > 0 stays True.',
        optionExplanations: [
          'The condition is checked again.',
          'Nothing decreases i.',
          'Correct.',
          'The code is valid.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'A while loop whose condition is False at the start runs…',
        options: ['Once', 'Zero times', 'Twice', 'Forever'],
        correctIndex: 1,
        explanation: 'Entry-controlled: the body is skipped if the condition is False.',
        optionExplanations: ['That would be exit-controlled.', 'Correct.', 'No.', 'No.'],
        difficulty: 'easy',
      },
      {
        stem: 'n = 345; s = 0; while n > 0: s += n % 10; n //= 10. s is…',
        options: ['345', '12', '543', '3'],
        correctIndex: 1,
        explanation: '5 + 4 + 3 = 12.',
        optionExplanations: [
          'n is broken into digits.',
          'Correct.',
          'That is the reverse.',
          'That is only the last step.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Which is an infinite loop?',
        options: ['while False:', 'while True:', 'while 0:', 'while "":'],
        correctIndex: 1,
        explanation: 'True never becomes False (unless break is used).',
        optionExplanations: ['Never runs.', 'Correct.', '0 is False.', 'Empty string is False.'],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Countdown',
        'easy',
        'Read a positive whole number **n**. Using a **while** loop, print n, n-1, … 1 (one per line), then `Lift off!`.',
        'n = int(input())\n',
        'n = int(input())\nwhile n > 0:\n    print(n)\n    n -= 1\nprint("Lift off!")',
        [['3'], ['1', true], ['10', true]],
        ['Decrease n inside the loop, or it never ends.'],
      ),
      py(
        'Sum of digits',
        'medium',
        'Read a positive whole number and print the **sum of its digits** using a while loop.\n\nExample: `1234` → `10`',
        'n = int(input())\ntotal = 0\n',
        'n = int(input())\ntotal = 0\nwhile n > 0:\n    total += n % 10\n    n //= 10\nprint(total)',
        [['1234'], ['9', true], ['90210', true], ['99999', true]],
        ['n % 10 is the last digit.', 'n //= 10 removes the last digit.'],
      ),
    ],
  },

  forloop: {
    video: {
      title: 'Python For Loop & Range Explained for Beginners (ThinkInCode)',
      url: 'https://www.youtube.com/watch?v=22A4mNIR9dM',
    },
    curiosity:
      'Your teacher asks for the 7 times table up to 7 × 10. You could write 10 print statements… or 2 lines. Which tool turns 10 lines into 2?',
    curiosityQuestion: {
      stem: 'Which line repeats the body for i = 1 to 10?',
      options: ['for i in range(1, 11):', 'for i in range(10):', 'for i in range(1, 10):'],
      correctIndex: 0,
      explanation: 'range(1, 11) gives 1 … 10; the stop value is not included.',
    },
    easy: 'A **for loop** repeats once for **each item** in a sequence.\n\n```python\nfor letter in "Python":\n    print(letter)\n\nfor fruit in ["banana", "apple", "mango"]:\n    print("Current fruit:", fruit)\n```\n\n`range()` makes a sequence of numbers:\n\n| Call | Gives |\n|---|---|\n| `range(5)` | 0, 1, 2, 3, 4 |\n| `range(1, 6)` | 1, 2, 3, 4, 5 |\n| `range(2, 11, 2)` | 2, 4, 6, 8, 10 |\n| `range(5, 0, -1)` | 5, 4, 3, 2, 1 |\n\nThe **stop value is never included**. Use for when you know how many times to repeat.',
    tenMark:
      '## Definition\nThe for loop iterates over the items of a sequence (string, list, tuple, range) and executes the body once per item. It manages the loop variable automatically.\n\n## Syntax\n```python\nfor variable in sequence:\n    statements\n```\n\n## Flowchart\nFor each item → last item reached? → No: body → next item; Yes: exit.\n\n## Examples\n```python\nfor letter in "Python":\n    print("Current Letter:", letter)\n\nfruits = ["banana", "apple", "mango"]\nfor fruit in fruits:\n    print("Current fruit:", fruit)\nprint("The End")\n```\n\n## range() function\n- `range(stop)`: 0 to stop-1\n- `range(start, stop)`: start to stop-1\n- `range(start, stop, step)`: in steps (negative steps count down)\n```python\nfor i in range(1, 11):\n    print(7, "x", i, "=", 7 * i)\n```\n\n## for with else\nThe else block runs when the loop finishes without break.\n\n## for vs while\n| for | while |\n|---|---|\n| Known number of iterations / a sequence | Unknown number, condition-based |\n| Loop variable managed automatically | Programmer updates the variable |\n\n## Conclusion\nThe for loop is the most common loop in Python for processing sequences and counting.',
    realWorld:
      '- **Results:** for each student in the class list, calculate the total and grade.\n- **Tables and reports:** print every row of a mark sheet.\n- **Messages:** send an SMS to every parent in the list.\n- **Data science:** go through every reading in a dataset.',
    flashcards: [
      ['range(1, 6) gives?', '1, 2, 3, 4, 5 (stop is excluded).'],
      ['range(10, 0, -2) gives?', '10, 8, 6, 4, 2'],
      ['for vs while?', 'for: a known sequence or count; while: repeat while a condition holds.'],
      ['Can a for loop go over a string?', 'Yes, one character at a time.'],
      ['When does for-else’s else run?', 'When the loop finishes without a break.'],
    ],
    mcqs: [
      {
        stem: 'How many numbers does range(3, 9) give?',
        options: ['9', '6', '7', '3'],
        correctIndex: 1,
        explanation: '3, 4, 5, 6, 7, 8: stop minus start = 6.',
        optionExplanations: [
          'Start is 3, not 0.',
          'Correct.',
          'Stop is excluded.',
          'That is the start value.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Output of: for i in range(5, 0, -2): print(i, end=" ")',
        options: ['5 4 3 2 1', '5 3 1', '5 3', '1 3 5'],
        correctIndex: 1,
        explanation: 'Start 5, step -2, stop before 0.',
        optionExplanations: [
          'Step is -2.',
          'Correct.',
          '1 is also included (1 > 0).',
          'It counts down.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'for ch in "ACET": print(ch). How many lines?',
        options: ['1', '4', '0', 'Error'],
        correctIndex: 1,
        explanation: 'One iteration per character.',
        optionExplanations: [
          'print adds a newline each time.',
          'Correct.',
          'The string is not empty.',
          'Strings are iterable.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'total = 0; for i in range(1, 5): total += i. total is…',
        options: ['15', '10', '5', '4'],
        correctIndex: 1,
        explanation: '1 + 2 + 3 + 4 = 10 (5 is excluded).',
        optionExplanations: [
          'That includes 5.',
          'Correct.',
          'That is a single value.',
          'That is the count.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which prints even numbers 2 to 10?',
        options: ['range(2, 10, 2)', 'range(2, 11, 2)', 'range(0, 10, 2)', 'range(2, 10)'],
        correctIndex: 1,
        explanation: 'Stop must be 11 so that 10 is included.',
        optionExplanations: [
          'Stops at 8.',
          'Correct.',
          'Includes 0, stops at 8.',
          'Step 1 prints odd numbers too.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      py(
        'Multiplication table',
        'easy',
        'Read a number **n** and print its table from 1 to 10 in this exact format:\n\n```\n7 x 1 = 7\n7 x 2 = 14\n...\n7 x 10 = 70\n```',
        'n = int(input())\nfor i in range(1, 11):\n    pass  # print one line\n',
        'n = int(input())\nfor i in range(1, 11):\n    print(n, "x", i, "=", n * i)',
        [['7'], ['12', true], ['1', true]],
        ['range(1, 11) gives 1 to 10.', 'print(n, "x", i, "=", n * i)'],
      ),
      py(
        'Even numbers up to n',
        'easy',
        'Read **n** and print all even numbers from 2 to n **on one line**, separated by spaces.\n\nExample: `10` → `2 4 6 8 10`',
        'n = int(input())\n',
        'n = int(input())\nfor i in range(2, n + 1, 2):\n    print(i, end=" ")\nprint()',
        [['10'], ['7', true], ['2', true]],
        ['range(2, n + 1, 2)', 'end=" " keeps numbers on one line.'],
      ),
    ],
  },

  nestedloops: {
    video: {
      title: 'Python nested loops (Bro Code)',
      url: 'https://www.youtube.com/watch?v=qwvswinpu2s',
    },
    curiosity:
      'A cinema has 5 rows and 8 seats in each row. To label every seat (A1 … E8), you have to go row by row, and inside each row, seat by seat. How many loops is that?',
    curiosityQuestion: {
      stem: '5 rows × 8 seats: how many times does the inner loop body run in total?',
      options: ['13', '40', '8'],
      correctIndex: 1,
      explanation: 'The inner loop runs 8 times for each of the 5 outer passes: 5 × 8 = 40.',
    },
    easy: 'A **nested loop** is a loop **inside** another loop. For every single pass of the outer loop, the inner loop runs **completely**.\n\n```python\nfor i in range(1, 4):        # rows\n    for j in range(1, 4):    # columns\n        print(i * j, end=" ")\n    print()                  # new line after each row\n```\nOutput:\n```\n1 2 3\n2 4 6\n3 6 9\n```\nThink: **outer loop = rows, inner loop = columns**. You can nest for in while, while in for, and so on.',
    tenMark:
      '## Definition\nA nested loop is a loop placed inside the body of another loop. The inner loop completes all its iterations for each iteration of the outer loop.\n\n## Syntax\n```python\nfor outer in sequence1:\n    for inner in sequence2:\n        statements\n    statements\n```\n```python\nwhile condition1:\n    while condition2:\n        statements\n    statements\n```\n\n## Number of iterations\nIf the outer loop runs m times and the inner loop n times, the inner body runs m × n times.\n\n## Example: multiplication grid\n```python\nfor i in range(1, 4):\n    for j in range(1, 4):\n        print(i * j, end=" ")\n    print()\n```\n\n## Example: prime numbers from 2 to 100 (nested while)\n```python\ni = 2\nwhile i < 100:\n    j = 2\n    while j <= i // j:\n        if i % j == 0:\n            break\n        j += 1\n    if j > i // j:\n        print(i, "is prime")\n    i += 1\n```\n\n## Applications\nTables and grids, pattern printing, matrices, comparing every pair of items.\n\n## Conclusion\nNested loops handle two-dimensional problems; keep track of which loop controls rows and which controls columns.',
    realWorld:
      '- **Seating plans:** rows × seats in an exam hall.\n- **Timetables:** days × periods.\n- **Images:** every pixel is processed row by row, column by column.\n- **Tournaments:** every team plays every other team.',
    flashcards: [
      ['What is a nested loop?', 'A loop inside another loop.'],
      ['Outer runs 4 times, inner 5: total inner runs?', '20 (4 × 5).'],
      ['Why print() after the inner loop?', 'To move to a new line after each row.'],
      ['Which loop usually controls rows?', 'The outer loop.'],
      ['Does break stop both loops?', 'No, only the innermost loop it is in.'],
    ],
    mcqs: [
      {
        stem: 'for i in range(3): for j in range(2): print("*"). How many stars?',
        options: ['5', '6', '3', '2'],
        correctIndex: 1,
        explanation: '3 outer × 2 inner = 6.',
        optionExplanations: [
          'Loops multiply, not add.',
          'Correct.',
          'That is only the outer count.',
          'That is only the inner count.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'In a nested loop, the inner loop…',
        options: [
          'Runs once in total',
          'Runs fully for each outer iteration',
          'Runs only on the last outer iteration',
          'Never runs',
        ],
        correctIndex: 1,
        explanation: 'It restarts and completes for every outer pass.',
        optionExplanations: [
          'It repeats.',
          'Correct.',
          'It runs every time.',
          'It runs if its range is not empty.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Output of: for i in range(1, 3): for j in range(1, 3): print(i + j, end=" ")',
        options: ['2 3 3 4', '1 2 1 2', '2 3 4', '1 2 3 4'],
        correctIndex: 0,
        explanation: '(1,1)=2, (1,2)=3, (2,1)=3, (2,2)=4.',
        optionExplanations: [
          'Correct.',
          'Those are j values only.',
          'One value is missing.',
          'Not sums of i and j.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'break inside the inner loop…',
        options: [
          'Ends both loops',
          'Ends only the inner loop',
          'Ends the program',
          'Skips one iteration',
        ],
        correctIndex: 1,
        explanation: 'break leaves the innermost loop only.',
        optionExplanations: [
          'The outer loop continues.',
          'Correct.',
          'Only the loop ends.',
          'That is continue.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Which problem naturally needs a nested loop?',
        options: [
          'Sum of 1 to n',
          'Printing a 5 × 5 grid',
          'Reading one number',
          'Checking even or odd',
        ],
        correctIndex: 1,
        explanation: 'Rows and columns: two dimensions.',
        optionExplanations: [
          'One loop is enough.',
          'Correct.',
          'No loop needed.',
          'No loop needed.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Multiplication grid',
        'medium',
        'Read **n** and print an n × n grid where row i, column j holds i × j. Separate numbers with a single space.\n\nExample `3`:\n```\n1 2 3\n2 4 6\n3 6 9\n```',
        'n = int(input())\n',
        'n = int(input())\nfor i in range(1, n + 1):\n    print(" ".join(str(i * j) for j in range(1, n + 1)))',
        [['3'], ['1', true], ['5', true]],
        [
          'Outer loop for rows, inner loop for columns.',
          'print(value, end=" ") then print() after each row.',
        ],
      ),
    ],
  },

  jumps: {
    video: {
      title: 'Python Loop Control: break, continue, and pass Explained (CodeLucky)',
      url: 'https://www.youtube.com/watch?v=Y2jCflkuO2Y',
    },
    curiosity:
      'You are searching a list of 1,000 roll numbers for yours. You find it at position 7. Should the loop keep checking the other 993?',
    curiosityQuestion: {
      stem: 'Which statement stops the loop as soon as the roll number is found?',
      options: ['continue', 'break', 'pass'],
      correctIndex: 1,
      explanation:
        'break leaves the loop immediately; continue only skips the rest of the current pass; pass does nothing.',
    },
    easy: 'Three statements change how a loop runs:\n\n| Statement | What it does |\n|---|---|\n| `break` | **Stops** the loop at once and jumps to the first line after it |\n| `continue` | **Skips** the rest of this pass and goes to the next one |\n| `pass` | Does **nothing**: a placeholder where a statement is required |\n\n```python\nfor letter in "Python":\n    if letter == "h":\n        break          # stops at h: prints P y t\n    print(letter)\n\nfor letter in "Python":\n    if letter == "h":\n        continue       # skips h: prints P y t o n\n    print(letter)\n```\nIn nested loops, break stops only the **innermost** loop.',
    tenMark:
      '## Introduction\nLoop control (jump) statements change the normal flow of a loop. Python has break, continue and pass.\n\n## 1. break\n- Terminates the loop immediately; execution continues after the loop.\n- Used when the result is found early (searching, prime checks).\n- In nested loops it ends only the innermost loop.\n```python\nfor letter in "Python":\n    if letter == "h":\n        break\n    print("Current Letter:", letter)\n```\nOutput: P, y, t\n```python\nvar = 10\nwhile var > 0:\n    print("Current variable value:", var)\n    var -= 1\n    if var == 5:\n        break\n```\nOutput: 10, 9, 8, 7, 6\n\n## 2. continue\n- Skips the remaining statements of the current iteration and moves to the next one.\n```python\nfor letter in "Python":\n    if letter == "h":\n        continue\n    print("Current Letter:", letter)\n```\nOutput: P, y, t, o, n (h is skipped)\n\n## 3. pass\n- A null operation: nothing happens. Used where a statement is required syntactically but no action is needed yet.\n```python\nfor i in range(1, 6):\n    pass\nprint("Loop completed")\n\ndef fun1(arg):\n    pass    # to be written later\n```\n\n## Comparison\n| break | continue | pass |\n|---|---|---|\n| Exits the loop | Skips to the next iteration | Does nothing |\n\n## Conclusion\nThese statements give precise control over loops and keep code readable.',
    realWorld:
      '- **break:** stop searching the results list once your register number is found.\n- **continue:** skip absent students when averaging marks.\n- **pass:** leave an empty function for a feature you will write later, so the program still runs.\n- **Games:** break out of the game loop when the player quits.',
    flashcards: [
      ['What does break do?', 'Exits the loop immediately.'],
      [
        'What does continue do?',
        'Skips the rest of the current iteration and continues with the next.',
      ],
      ['What does pass do?', 'Nothing; it is a placeholder.'],
      ['break in a nested loop ends…', 'Only the innermost loop.'],
      ['Output of: for c in "abc": if c == "b": continue; print(c)', 'a and c'],
    ],
    mcqs: [
      {
        stem: 'for i in range(1, 6): if i == 3: break; print(i). Output?',
        options: ['1 2', '1 2 3', '1 2 4 5', '3'],
        correctIndex: 0,
        explanation: 'The loop stops when i is 3, before printing it.',
        optionExplanations: [
          'Correct.',
          '3 is not printed.',
          'That is continue.',
          'Nothing after break.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'for i in range(1, 6): if i == 3: continue; print(i). Output?',
        options: ['1 2', '1 2 4 5', '1 2 3 4 5', '3'],
        correctIndex: 1,
        explanation: 'Only i = 3 is skipped.',
        optionExplanations: ['That is break.', 'Correct.', '3 is skipped.', 'The opposite.'],
        difficulty: 'easy',
      },
      {
        stem: 'Which statement is a placeholder that does nothing?',
        options: ['break', 'continue', 'pass', 'return'],
        correctIndex: 2,
        explanation: 'pass is a null operation.',
        optionExplanations: [
          'break exits a loop.',
          'continue skips an iteration.',
          'Correct.',
          'return leaves a function.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'for c in "Python": if c == "h": pass; print(c). How many letters print?',
        options: ['3', '5', '6', '0'],
        correctIndex: 2,
        explanation: 'pass does nothing, so every letter is printed.',
        optionExplanations: [
          'That is break.',
          'That is continue.',
          'Correct.',
          'pass does not stop printing.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'n = 10; while n > 0: n -= 3; if n < 5: break. n is…',
        options: ['4', '1', '7', '-2'],
        correctIndex: 0,
        explanation: 'n becomes 7, then 4; 4 < 5 so break.',
        optionExplanations: [
          'Correct.',
          'The loop stopped earlier.',
          '7 is not < 5.',
          'break happened before.',
        ],
        difficulty: 'hard',
      },
    ],
    challenges: [
      py(
        'Stop at the first negative',
        'medium',
        'Read whole numbers **on one line**. Add them up from the left, but **stop** as soon as you meet a negative number (don’t add it). Print `Sum = <total>`.\n\nExample: `4 7 -1 10` → `Sum = 11`',
        'numbers = list(map(int, input().split()))\ntotal = 0\n',
        'numbers = list(map(int, input().split()))\ntotal = 0\nfor x in numbers:\n    if x < 0:\n        break\n    total += x\nprint("Sum =", total)',
        [['4 7 -1 10'], ['1 2 3', true], ['-5 8 9', true], ['10 0 20 -3 30', true]],
        ['Use break when x < 0.'],
      ),
      py(
        'Skip multiples of 3',
        'easy',
        'Read **n** and print the numbers from 1 to n that are **not** multiples of 3, on one line separated by spaces. Use continue.\n\nExample: `10` → `1 2 4 5 7 8 10`',
        'n = int(input())\n',
        'n = int(input())\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        continue\n    print(i, end=" ")\nprint()',
        [['10'], ['3', true], ['14', true]],
        ['i % 3 == 0 means i is a multiple of 3.'],
      ),
    ],
  },

  patterns: {
    video: {
      title: 'Printing Stars "*" in Pyramid Shape | Python Pattern Program (ProgramsAndMe)',
      url: 'https://www.youtube.com/watch?v=nFEj5mhq6xQ',
    },
    curiosity:
      'In your lab exam you must print a pyramid of stars for any number of rows the examiner types. You can’t type each line by hand. What decides how many stars go on row 3?',
    curiosityQuestion: {
      stem: 'In a right-angled star triangle, row i has how many stars?',
      options: ['Always 5', 'i stars (row number)', 'i × i stars'],
      correctIndex: 1,
      explanation:
        'The inner loop runs i times on row i, so the triangle grows by one star per row.',
    },
    easy: '**Pattern generation** prints stars, numbers or letters in a shape using loops.\n\nThe secret is always the same:\n\n- **Outer loop = rows** (`for i in range(1, rows + 1)`)\n- **Inner loop = what goes on each row** (how many depends on `i`)\n- `print(..., end=" ")` keeps items on one line; `print()` starts the next row.\n\n```python\nrows = 5\nfor i in range(1, rows + 1):\n    for j in range(i):\n        print("*", end=" ")\n    print()\n```\nFor a **pyramid**, print spaces first: `print(" " * (rows - i) + "* " * i)`. Letters use `chr(65 + j)` (65 is "A").',
    tenMark:
      '## Definition\nPattern generation is printing symbols, numbers or characters in a particular arrangement using loops (mostly nested loops) and print().\n\n## Types\nStar patterns, number patterns, alphabet patterns, pyramid patterns and inverted patterns.\n\n## 1. Right-angled triangle\n```python\nrows = 5\nfor i in range(1, rows + 1):\n    for j in range(i):\n        print("*", end=" ")\n    print()\n```\nOutput rows: 1 to 5 stars.\n- The outer loop controls rows; the inner loop prints i stars; end=" " keeps them on one line; print() moves to the next line.\n\n## 2. Inverted triangle\n```python\nfor i in range(rows, 0, -1):\n    for j in range(i):\n        print("*", end=" ")\n    print()\n```\n\n## 3. Pyramid\n```python\nfor i in range(1, rows + 1):\n    print(" " * (rows - i) + "* " * i)\n```\n\n## 4. Number patterns\n```python\nfor i in range(1, rows + 1):\n    for j in range(1, i + 1):\n        print(j, end=" ")      # 1 / 1 2 / 1 2 3 ...\n    print()\n```\nRepeated numbers: print(i, end=" ") gives 1 / 2 2 / 3 3 3 …\n\n## 5. Alphabet triangle\n```python\nfor i in range(1, rows + 1):\n    for j in range(i):\n        print(chr(65 + j), end=" ")   # A / A B / A B C ...\n    print()\n```\n\n## Applications\nUnderstanding nested loops, logical thinking, loop control practice, lab exams and interviews, formatting output.\n\n## Conclusion\nEvery pattern is a rule linking the row number to what is printed on that row.',
    realWorld:
      '- **Lab exams and placement tests** regularly ask star and number patterns.\n- **Seating and invigilation charts** are printed row by row with the same nested-loop idea.\n- **ASCII art and console games** draw shapes with characters.\n- **Image processing** walks over pixels row by row, exactly like a pattern program.',
    flashcards: [
      ['In a pattern, what does the outer loop control?', 'The rows.'],
      [
        'What does print("*", end=" ") do?',
        'Prints a star and a space without starting a new line.',
      ],
      ['How do you start the next row?', 'An empty print().'],
      ['chr(65)?', '"A"'],
      ['Spaces before row i of a 5-row pyramid?', '5 - i'],
    ],
    mcqs: [
      {
        stem: 'for i in range(1, 4): print("*" * i). The last line is…',
        options: ['*', '**', '***', '****'],
        correctIndex: 2,
        explanation: 'i goes up to 3, and "*" * 3 is "***".',
        optionExplanations: [
          'That is the first line.',
          'That is the second line.',
          'Correct.',
          'range stops before 4.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which outer loop prints an inverted triangle of 5 rows?',
        options: ['range(1, 6)', 'range(5, 0, -1)', 'range(0, 5)', 'range(6)'],
        correctIndex: 1,
        explanation: 'Counting 5, 4, 3, 2, 1 makes each row shorter.',
        optionExplanations: [
          'That grows.',
          'Correct.',
          'Starts with 0 stars.',
          'Starts with 0 stars.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'for i in range(1, 4): for j in range(i): print(i, end=" "); print(). Row 3 is…',
        options: ['1 2 3', '3 3 3', '3', '1 1 1'],
        correctIndex: 1,
        explanation: 'It prints the row number i, i times.',
        optionExplanations: [
          'That prints j + 1.',
          'Correct.',
          'It repeats i times.',
          'It prints i, not 1.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'chr(65 + 2) is…',
        options: ['A', 'B', 'C', '67'],
        correctIndex: 2,
        explanation: '65 is "A", so 67 is "C".',
        optionExplanations: [
          'That is 65.',
          'That is 66.',
          'Correct.',
          'chr() returns a character.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Why is print() written after the inner loop?',
        options: [
          'To print a star',
          'To move to the next line after each row',
          'To end the program',
          'It is optional',
        ],
        correctIndex: 1,
        explanation: 'The inner prints stay on one line (end=" "); print() ends the row.',
        optionExplanations: [
          'It prints nothing visible.',
          'Correct.',
          'The loop continues.',
          'Without it everything is on one line.',
        ],
        difficulty: 'easy',
      },
    ],
    challenges: [
      py(
        'Right-angled star triangle',
        'easy',
        'Read the number of **rows** and print a right-angled triangle. Row i has i stars, each followed by a space (trailing spaces don’t matter).\n\nExample `3`:\n```\n*\n* *\n* * *\n```',
        'rows = int(input())\nfor i in range(1, rows + 1):\n    # inner loop here\n    print()\n',
        'rows = int(input())\nfor i in range(1, rows + 1):\n    for j in range(i):\n        print("*", end=" ")\n    print()',
        [['3'], ['1', true], ['6', true]],
        ['Inner loop: for j in range(i).', 'print("*", end=" ")'],
      ),
      py(
        'Number triangle',
        'easy',
        'Read **rows** and print:\n\n```\n1\n1 2\n1 2 3\n```\n(for rows = 3). Row i has the numbers 1 to i.',
        'rows = int(input())\n',
        'rows = int(input())\nfor i in range(1, rows + 1):\n    for j in range(1, i + 1):\n        print(j, end=" ")\n    print()',
        [['3'], ['5', true], ['1', true]],
        ['Inner loop: for j in range(1, i + 1).'],
      ),
      py(
        'Star pyramid',
        'medium',
        'Read **rows** and print a centred pyramid. Row i has (rows − i) spaces, then i copies of `* `.\n\nExample `3`:\n```\n  *\n * *\n* * *\n```',
        'rows = int(input())\n',
        'rows = int(input())\nfor i in range(1, rows + 1):\n    print(" " * (rows - i) + "* " * i)',
        [['3'], ['1', true], ['5', true]],
        [
          '" " * (rows - i) makes the leading spaces.',
          'Leading spaces matter; trailing ones don’t.',
        ],
      ),
      py(
        'Alphabet triangle',
        'medium',
        'Read **rows** and print an alphabet triangle (row i has the first i capital letters).\n\nExample `3`:\n```\nA\nA B\nA B C\n```',
        'rows = int(input())\n',
        'rows = int(input())\nfor i in range(1, rows + 1):\n    for j in range(i):\n        print(chr(65 + j), end=" ")\n    print()',
        [['3'], ['5', true], ['1', true]],
        ['chr(65) is "A", chr(66) is "B" …'],
      ),
    ],
  },

  problemsolving: {
    video: {
      title:
        'Python Tutorial for Beginners 12 - While Loop and For Loops in Python (ProgrammingKnowledge)',
      url: 'https://www.youtube.com/watch?v=26VtIlzEcmU',
    },
    curiosity:
      'Young Gauss added 1 + 2 + … + 100 in seconds. A computer adds them one by one in microseconds. How do you tell it to “keep adding the next number”?',
    curiosityQuestion: {
      stem: 'What does a running-total loop need before it starts?',
      options: ['total = 0 (an accumulator)', 'total = 100', 'Nothing'],
      correctIndex: 0,
      explanation: 'Start the accumulator at 0, then add each number inside the loop.',
    },
    easy: 'Most loop problems follow one of a few **patterns**:\n\n1. **Accumulate:** start `total = 0`, add inside the loop (sum of n numbers).\n2. **Multiply:** start `fact = 1`, multiply inside the loop (factorial).\n3. **Count:** start `count = 0`, add 1 when a condition holds (count evens).\n4. **Search:** loop and `break` when found (is n prime?).\n\n```python\ntotal = 0\nfor i in range(1, 11):\n    total = total + i\nprint("Sum =", total)    # 55\n```\nPlan first: what repeats, how many times, and what you keep track of.',
    tenMark:
      '## Introduction\nLoops let a program solve problems that need a step to be repeated. Good loop solutions start from a clear plan: initialise, repeat, update, output.\n\n## Steps\n1. Understand the input and expected output.\n2. Decide what repeats and how many times (for) or until when (while).\n3. Initialise variables (accumulator = 0, product = 1, counter = 0).\n4. Update them inside the loop.\n5. Print the result after the loop.\n\n## Example 1: Sum of the first 10 natural numbers\n```python\ntotal = 0\nfor i in range(1, 11):\n    total = total + i\nprint("Sum =", total)\n```\nOutput: Sum = 55\n- total = 0 initialises the sum.\n- The for loop runs from 1 to 10.\n- Each number is added to total; the sum is printed at the end.\n\n## Example 2: Factorial\n```python\nn = 5\nfact = 1\nfor i in range(1, n + 1):\n    fact *= i\nprint(fact)    # 120\n```\n\n## Example 3: Prime check\n```python\nn = 29\nis_prime = n > 1\nfor d in range(2, int(n ** 0.5) + 1):\n    if n % d == 0:\n        is_prime = False\n        break\nprint(n, "is prime" if is_prime else "is not prime")\n```\n\n## Example 4: Count digits\n```python\nn = 9045\ncount = 0\nwhile n > 0:\n    n //= 10\n    count += 1\n```\n\n## Conclusion\nAccumulators, counters, products and early exit with break solve most beginner problems.',
    realWorld:
      '- **Results:** total and average marks of a class.\n- **Billing:** add up every item’s price × quantity.\n- **Interest:** grow a deposit year by year in a loop.\n- **Security:** prime numbers are the basis of the RSA encryption used in UPI and HTTPS.',
    flashcards: [
      ['Initial value of a sum accumulator?', '0'],
      ['Initial value of a factorial product?', '1'],
      ['5! = ?', '120'],
      ['Divisors needed to check if n is prime?', '2 up to the square root of n.'],
      ['Sum of 1 to 10?', '55'],
    ],
    mcqs: [
      {
        stem: 'fact = 1; for i in range(1, 5): fact *= i. fact is…',
        options: ['120', '24', '10', '4'],
        correctIndex: 1,
        explanation: '1 × 2 × 3 × 4 = 24 (5 is excluded).',
        optionExplanations: [
          'That would include 5.',
          'Correct.',
          'That is a sum.',
          'That is the last i.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Why must a product start at 1, not 0?',
        options: [
          'Python requires it',
          'Multiplying by 0 always gives 0',
          '1 is faster',
          'It doesn’t matter',
        ],
        correctIndex: 1,
        explanation: '0 × anything is 0, so the result would always be 0.',
        optionExplanations: [
          'Not a rule of Python.',
          'Correct.',
          'Speed is not the reason.',
          'It matters a lot.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'count = 0; for i in range(1, 11): if i % 2 == 0: count += 1. count is…',
        options: ['10', '5', '6', '55'],
        correctIndex: 1,
        explanation: 'Even numbers 2, 4, 6, 8, 10.',
        optionExplanations: [
          'Only evens are counted.',
          'Correct.',
          '11 is not included.',
          'That is a sum.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which number is prime?',
        options: ['1', '21', '29', '49'],
        correctIndex: 2,
        explanation: '29 has no divisors other than 1 and itself.',
        optionExplanations: ['1 is not prime.', '21 = 3 × 7.', 'Correct.', '49 = 7 × 7.'],
        difficulty: 'easy',
      },
      {
        stem: 'In a prime check, why use break when a divisor is found?',
        options: [
          'To skip that divisor',
          'No need to check further: n is not prime',
          'To restart the loop',
          'break is required syntax',
        ],
        correctIndex: 1,
        explanation: 'One divisor is enough to decide; stopping saves time.',
        optionExplanations: [
          'That is continue.',
          'Correct.',
          'break exits, it does not restart.',
          'It is optional.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      py(
        'Sum of first n natural numbers',
        'easy',
        'Read **n** and print the sum 1 + 2 + … + n using a loop.\n\n**Output:** `Sum = <total>`\n\nExample: `10` → `Sum = 55`',
        'n = int(input())\ntotal = 0\n',
        'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total = total + i\nprint("Sum =", total)',
        [['10'], ['1', true], ['100', true]],
        ['Start total at 0 and add i inside the loop.'],
      ),
      py(
        'Factorial',
        'easy',
        'Read **n** (0 ≤ n ≤ 20) and print n! (n factorial). Remember 0! = 1.\n\nExample: `5` → `120`',
        'n = int(input())\nfact = 1\n',
        'n = int(input())\nfact = 1\nfor i in range(1, n + 1):\n    fact *= i\nprint(fact)',
        [['5'], ['0', true], ['10', true], ['20', true]],
        ['Start the product at 1.'],
      ),
      py(
        'Prime or not',
        'medium',
        'Read a whole number **n** (n ≥ 1) and print `<n> is prime` or `<n> is not prime`. (1 is not prime.)\n\nExample: `29` → `29 is prime`',
        'n = int(input())\n',
        'n = int(input())\nis_prime = n > 1\nd = 2\nwhile d * d <= n:\n    if n % d == 0:\n        is_prime = False\n        break\n    d += 1\nif is_prime:\n    print(n, "is prime")\nelse:\n    print(n, "is not prime")',
        [['29'], ['1', true], ['2', true], ['49', true], ['97', true], ['100', true]],
        ['Check divisors from 2 while d * d <= n.', 'break as soon as one divides n.'],
      ),
    ],
  },
};

/** The PSPP subject's root page. */
export const PSPP_OVERVIEW = {
  tagline: 'Learn to think like a programmer: break a problem into steps and let Python do them.',
  why:
    'Every engineering branch now uses code: to analyse lab data, automate reports, control devices and build apps. ' +
    'Python is the easiest serious language to start with, and the same skills (**decisions** and **loops**) carry over to C, Java and every language you learn next. ' +
    'It is also the language of data science and AI, and a regular part of placement tests.',
  prerequisites: [
    {
      title: 'School mathematics',
      why: 'Remainders, averages and simple formulas appear in almost every program.',
    },
    {
      title: 'Logical thinking: “if this, then that”',
      why: 'Conditions and loops are everyday decisions written precisely.',
    },
    {
      title: 'Basic computer use',
      why: 'You will install Python, create files and run programs from an editor.',
    },
  ],
  outcomes: [
    'Explain how Python programs run and use interactive and script modes.',
    'Choose the right data type and convert between types.',
    'Read input and print formatted output.',
    'Write decisions with if, if-else, elif and nested if.',
    'Solve problems with for, while and nested loops, using break, continue and pass.',
    'Print star, number and alphabet patterns for lab exams and interviews.',
  ],
  applications: [
    {
      title: 'Automation',
      description: 'Merge mark sheets, rename files and send circulars with a short script.',
    },
    {
      title: 'Data analysis',
      description: 'Pandas and Matplotlib turn attendance and results into charts.',
    },
    {
      title: 'AI and machine learning',
      description: 'Face recognition, chatbots and recommendation systems are built in Python.',
    },
    {
      title: 'Web and apps',
      description: 'Instagram and YouTube run large parts of their servers on Python.',
    },
  ],
  careers: [
    'Python developer',
    'Data analyst',
    'Automation engineer',
    'Machine learning engineer',
    'Software tester',
  ],
  units: {
    1: {
      summary:
        'What Python is and how to run it, then the building blocks: variables, data types, input/output, operators and type conversion.',
      youWillBeAbleTo:
        'Write a script that reads values, calculates with them and prints a clear result.',
      leadsTo:
        'Once your program can calculate, the next step is letting it decide and repeat: Unit 2 adds conditions and loops, built on the comparison and logical operators you learned here.',
    },
    2: {
      summary:
        'Decision making with if, if-else, elif and nested if; repetition with while, for and nested loops; break, continue and pass; patterns and problem solving.',
      youWillBeAbleTo:
        'Solve problems such as grades, sums, factorials and primes, and print any star or number pattern.',
      leadsTo: '',
    },
  },
};
