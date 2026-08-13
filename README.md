# Speak2Code

A natural language to C++ compiler that translates plain English statements into executable C++ code. Write programs the way you'd explain them to a person — MiniLang handles the rest.

## Features

* **Natural Language Input**: Write code in plain English
* **C++ Code Generation**: Outputs clean, compilable C++ with `#include <iostream>` and `int main()`
* **Interactive Web UI**: Real-time compilation and code visualization

## Getting Started

### Prerequisites

* Node.js (v14 or higher)
* npm

### Installation

1. Clone or download the project
2. Install dependencies:

```bash
npm install
```

### Running the Server

Start the development server:

```bash
npm start
```

The backend will be available at `http://localhost:5000`

## Usage

### Basic Syntax

**Variable Declaration:**

```
create variable x with value 5
declare y be 10
let z with value 3
```

**Assignment & Arithmetic:**

```
set result to x plus y
assign sum to a plus b minus c
set product to x times y
```

**Operators:**

* `plus` → `+`
* `minus` → `-`
* `times` → `*`
* `divide` → `/`
* `modulo` / `mod` → `%`
* `power` → `**`

**Print / Output:**

```
print x
show result
display the value of y
```

**Conditionals:**

```
if x greater than 5
  print x
end if
```

**Loops:**

```
while i less than 10
  set i to i plus 1
end while
```

### Example Program

```
create variable x with value 5
create variable y with value 3
set result to x plus y
print result

if x greater than 4
  print x
end if

while y less than 8
  set y to y plus 1
end while

print y
```

This generates:

```cpp
#include <iostream>
using namespace std;

int main() {
    int x = 5;
    int y = 3;
    result = x + y;
    cout << result << endl;
    if (x > 4) {
        cout << x << endl;
    }
    while (y < 8) {
        y = y + 1;
    }
    cout << y << endl;
    return 0;
}
```

## Project Structure

```
.
├── server.js           # Node.js/Express backend with compiler logic
├── package.json        # Dependencies and scripts
├── README.md           # This file
└── static/
    └── index.html      # Web UI interface
```

## API Endpoints

### POST `/compile`

Compiles natural language code to C++.

**Request Body:**

```json
{
  "source": "create variable x with value 5\nprint x"
}
```

**Response:**

```json
{
  "tokens": ["create", "variable", "x", "with", "value", "5", "print", "x"],
  "ast": [...],
  "tac": [...],
  "dag": [...],
  "code": "#include <iostream>\n..."
}
```

## Built With

* **Express.js** - Web framework
* **Node.js** - Runtime environment
