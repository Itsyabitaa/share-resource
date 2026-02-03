// Test script for markdown formatter
const { formatToMarkdown, isAlreadyMarkdown } = require('../utils/markdownFormatter')

console.log('🧪 Testing Markdown Formatter\n')

// Test 1: Heading detection
console.log('Test 1: Heading Detection')
console.log('='.repeat(50))
const headingTest = `INTRODUCTION
This is some text.

Section One:
More text here.

Another Section
===
Content here.`

console.log('Input:')
console.log(headingTest)
console.log('\nOutput:')
console.log(formatToMarkdown(headingTest))
console.log('\n')

// Test 2: List detection
console.log('Test 2: List Detection')
console.log('='.repeat(50))
const listTest = `Shopping list:
• Apples
• Bananas
• Oranges

Steps to follow:
1) First step
2) Second step
3) Third step`

console.log('Input:')
console.log(listTest)
console.log('\nOutput:')
console.log(formatToMarkdown(listTest))
console.log('\n')

// Test 3: Code block detection
console.log('Test 3: Code Block Detection')
console.log('='.repeat(50))
const codeTest = `Here is some code:

    function hello() {
        console.log("Hello World");
    }

And some more text.`

console.log('Input:')
console.log(codeTest)
console.log('\nOutput:')
console.log(formatToMarkdown(codeTest))
console.log('\n')

// Test 4: Link formatting
console.log('Test 4: Link Formatting')
console.log('='.repeat(50))
const linkTest = `Check out this website: https://example.com
And this one too: https://github.com/user/repo`

console.log('Input:')
console.log(linkTest)
console.log('\nOutput:')
console.log(formatToMarkdown(linkTest))
console.log('\n')

// Test 5: Already markdown detection
console.log('Test 5: Already Markdown Detection')
console.log('='.repeat(50))
const markdownTest = `# Heading

- List item 1
- List item 2

\`\`\`javascript
const x = 10;
\`\`\`

[Link](https://example.com)`

console.log('Input:')
console.log(markdownTest)
console.log('\nIs already markdown?', isAlreadyMarkdown(markdownTest))
console.log('\n')

// Test 6: Complex mixed content
console.log('Test 6: Complex Mixed Content')
console.log('='.repeat(50))
const mixedTest = `PROJECT OVERVIEW

This is a description of the project.

Key Features:
• Feature one
• Feature two
• Feature three

Installation Steps:
1) Clone the repository
2) Install dependencies
3) Run the server

Code Example:
    npm install
    npm start

For more info visit: https://docs.example.com

CONCLUSION
That's all folks!`

console.log('Input:')
console.log(mixedTest)
console.log('\nOutput:')
console.log(formatToMarkdown(mixedTest))
console.log('\n')

console.log('✅ All tests completed!')
