<style>
/* Terminal presentation theme */
body {
  background: #1a1a1a;
  color: #e5e5e5;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 28px;
  line-height: 1.6;
  margin: 0;
  padding: 40px;
}

h1, h2, h3, h4, h5, h6 {
  color: #4ECDC4;
  font-weight: bold;
  margin: 60px 0 30px 0;
}

h1 {
  font-size: 64px;
  color: #A8A8FF;
  text-align: center;
  border-bottom: 3px solid #333;
  padding-bottom: 30px;
}

h2 {
  font-size: 48px;
  color: #FFD93D;
}

h3 {
  font-size: 40px;
  color: #FF8C42;
}

h4 {
  font-size: 36px;
  color: #6BCF7F;
}

p, li {
  font-size: 32px;
  margin: 20px 0;
}

ul, ol {
  margin: 30px 0;
  padding-left: 60px;
}

li {
  margin: 15px 0;
}

blockquote {
  background: #0a0a0a;
  border-left: 5px solid #FFD93D;
  padding: 30px;
  margin: 40px 0;
  font-style: italic;
  color: #FFD93D;
}

code {
  background: #0a0a0a;
  color: #6BCF7F;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 28px;
}

pre {
  background: #0a0a0a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 30px;
  overflow-x: auto;
  margin: 40px 0;
}

pre code {
  background: none;
  padding: 0;
  color: #e5e5e5;
}

.terminal-prompt {
  color: #A8A8FF;
  font-weight: bold;
}

.ai-response {
  color: #FF8C42;
  font-style: italic;
}

strong {
  color: #FFD93D;
  font-weight: bold;
}

em {
  color: #FF8C42;
  font-style: italic;
}

a {
  color: #4ECDC4;
  text-decoration: underline;
}

a:hover {
  color: #6BCF7F;
}

/* Slide separators */
hr {
  border: none;
  height: 3px;
  background: #333;
  margin: 80px 0;
}

/* Page breaks for presentation */
._break {
  page-break-before: always;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

# <span class="terminal-prompt">$</span> HOW I AI
## Getting better Code Suggestions

---

<div class="_break"></div>

---

## <span class="terminal-prompt">></span>  Greg Dunn

**Staff Engineer** | **Music Enthusiast** | **AI Newbie**

<img src="./vacation_greg.jpg" width="300px"  alt="Vacation Greg">



---

<div class="_break"></div>

---

## <span class="terminal-prompt">$</span> I asked the AI:

**How can I get better Angular code suggestions in Copilot?**

> <span class="ai-response">🤖 : Just add more **Context**.</span>

---

<div class="_break"></div>

---

# <span class="terminal-prompt">></span> Context

**What is it?**

- **Your Code**
- **What changed?**
- **What's broken?**
- **Framework reference**
- **Best Practices**
- **Any relevant info**

### The more context the AI has, the better suggestions it will give you.

---

<div class="_break"></div>

---

## 📐 Adding Angular Context

**Recently, Angular released files to help add more context to Code suggestions.**

- **Angular LLMs Resource**
  - A resource for LLMs to understand Angular. Basically, the entire Angular documentation website in a single file.

- **Angular Best Practices Prompt**
  - Simple prompts to get more modern suggestions and fix issues that keep popping up

---

<div class="_break"></div>

---

## <span class="terminal-prompt">$</span> DEMO

**Let's look at the contents**

---

<div class="_break"></div>

---

## How to use them with Copilot?

1. **Save both files** to the `.github/instructions/` directory

2. **Click Add Context**

3. **Select your files**

4. **Copilot is now a master level Angular dev**

---

<div class="_break"></div>

---

## AI Talking Points

### 1. ✨ Ensures AI-Generated Code Follows Angular Best Practices

- **Consistent Code Style:** Structured approaches to components, naming, and organization
- **Modern Angular Patterns:** Signals, standalone components, cutting-edge features
- **Performance Optimization:** OnPush and avoiding anti-patterns

### 2. 🔄 Aligns with Angular's Latest Recommendations

- **Signal-Based Approach:** Embracing the future with signal-based APIs
- **Standalone Components:** Breaking free from NgModule constraints
- **Native Control Flow:** @if/@for FTW, leaving *ngIf/*ngFor in the past

### 3. 🧩 Provides Specific Angular Domain Knowledge

- **Angular-Specific Techniques:** Content projection, styling, and selectors
- **Framework-Aware Code Generation:** Code that understands Angular's soul
- **More Than Syntax:** Architectural guidance specific to Angular applications

---

<div class="_break"></div>

---

# 📋 Adding Testing Context

---

<div class="_break"></div>

---

## <span class="terminal-prompt">$</span> I asked the AI:

**What would increase efficiency in debugging failing tests?**
> <span class="ai-response">🤖 : **Context** is key.</span>

**What if I provide the latest changes?**
> <span class="ai-response">🤖 : That would let me know what you did.</span>

**What if I provide the latest test run?**
> <span class="ai-response">🤖 : That would tell me what you messed up.</span>

**How about a link to the Jira ticket?**
> <span class="ai-response">🤖 : I don't mess with Jira.</span>

---

<div class="_break"></div>

---

## <span class="terminal-prompt">></span> The Problem
 I could :  
- run git diff and copy the output.
- Then run jest and copy that output.

 **`But that just became tedious...`** 
---

<div class="_break"></div>

---



## <span class="terminal-prompt">></span> My Solution

- I worked with **GPT, Gemini and Claude** to write a script
- I liked **Claude's approach** the best
- We created an **`.ai_utilities`** script file to help automate the process`**

---

<div class="_break"></div>

---

## The Utility Functions

**It has 3 functions:**

### 📂 **gitDiff**
- Uses git diff to save your current code changes to a file
- AI added all sorts of error handling

### 🧪 **nxTest**
- Runs Jest tests for NX projects, folders or a single file
- Added console formatting to make it easier to read
- Saves output to a file

### 🔍 **aiDebug**
- Adds helpful prompts to the header
- Combines gitDiff and nxTest into a single file
- Suggests how to use the output file

---

<div class="_break"></div>

---

## Demo 

*How you use aiDebug in 7 easy steps*

<br/>

<br/>

**1.** Find a branch with broken tests 🤷


<br/>

**2.** Run the aiDebug command on your project in the terminal

*Example using settings-voice-assist-feature:*

```
aiDebug settings-voice-assist-feature
```

**If tests fail, you'll see output like this:**
```
❌ Tests failed with exit code: 1
==========================================================
The following debug files have been generated:
- Git diff: .github/instructions/diff.txt
- Test report: .github/instructions/jest-output.txt
- Combined context: .github/instructions/ai-debug-context.txt (recommended)

======================================
📋 BEST WAY TO GET AI HELP WITH TEST FAILURES
======================================
```

---

<div class="_break"></div>

---

## Demo - Steps 3-7

**3. Huzzah!** You now have a context file to help AI debug your tests

<br/>

**4. Add the context file to Copilot:**

   - Select `.github/instructions/ai-debug-context.txt`
   - This file includes both your code changes and test failures

   or 

   - Create a new file in the `.github/instructions/copilot-instructions.md file that includes the a link to the context file!

<br/>

**5. Ask Copilot to look at the context file:**
```
Can you help debug test failures based on the ai-debug-context file?
```

<br/>

**6. Read the nicely tailored response:**
   - Analysis of what's breaking the tests
   - Suggested fixes for each failing test
   - Explanation of root causes
   - Additional test cases if needed

<br/>

**7. Decide on the best approach**

---

<div class="_break"></div>

---


Then for Extra Credit, 

Claude and I worked together to create a 
VSCode extension that automates the process of gathering context.

-  It's stil rough around the edges, but it works!


**Demo the VSCode Extension**

---

<div class="_break"></div>

---

Fill the awkward silence

## <span class="terminal-prompt">$</span> I asked the AI:

**Tell me a Frontend Developer Joke:**

**Q:** What's a frontend developer's favorite sandwich?  
**A:** One with lots of layers and proper DOM manipulation.

### In conclusion, **Comedy** is still a safe career choice.

---

<div class="_break"></div>

---

This is v2:

- v1 got out of control and was too complex

- Just approved everything and let him run wild

** I ended up with 600 broken tests
and Claude build a Plugin Marketplace so I could 
open up my own store? **

---

<div class="_break"></div>

---

### AI Talking Points

#### 1. 🔄 Streamlined Testing and Debugging Workflow
- **Single Command Execution:** One command (aiDebug) to rule them all
- **Automatic Context Collection:** No more manual diff gathering
- **Time Savings:** Turn 10 minutes of work into 10 seconds

#### 2. 🤝 Enhanced Collaboration with AI Assistants
- **AI-Optimized Outputs:** Perfectly structured context for AI consumption
- **Built-in Prompting:** Self-explanatory context files that guide AI responses
- **Reduced Context-Switching:** Stay focused on solving, not explaining

#### 3. 📋 Consistent and Well-Formatted Output
- **Clean, Readable Test Reports:** Beautiful test outputs, every time
- **Organized Structure:** Clear section headers make navigation a breeze
- **Complete Context:** Tests + code changes = root cause insights

---

<div class="_break"></div>

---


# So, add more context to your AI prompts!


---

<div class="_break"></div>

---

### <span class="terminal-prompt">></span> Links

📚 [Angular Developing with AI](https://angular.dev/ai/develop-with-ai)  
📝 [Angular Best Practices Prompt](https://angular.dev/assets/context/best-practices.md)  
🔍 [Angular LLMs Resource](https://angular.dev/llms-full.txt)

[VSCode Context](https://code.visualstudio.com/blogs/2025/03/26/custom-instructions)  
[Copilot Instruction files for GitHub](https://docs.github.com/en/copilot/how-tos/custom-instructions/adding-repository-custom-instructions-for-github-copilot)

[.ai_utilities Repo](https://gist.github.com/your-username/your-gist-id)

---

<div class="_break"></div>


---

## <span class="terminal-prompt">$</span> EOF