# AI Debug Context V3 - Phase 2.0: Git Diff & Post-Test Intelligence

## 🎯 **Core Objective**
Transform test failures into immediate AI-assisted debugging sessions and test successes into PR-ready documentation.

---

## 📋 **Phase 2.0 Feature Set**

### **1. Git Diff Module** 
Save current git diff to `.github/instructions/ai_debug_context/diff.txt`
- **Purpose**: Capture exact code changes for AI context
- **Trigger**: Before test execution
- **Format**: Clean diff output matching gitDiff.zsh behavior

### **2. Test Output Capture**
Save test results to `.github/instructions/ai_debug_context/test-output.txt`
- **Purpose**: Preserve full test output for AI analysis
- **Trigger**: After test execution completes
- **Format**: Raw terminal output with ANSI stripped

### **3. Post-Test Failure Actions**
When tests fail, offer three options:

#### **🤖 AI Debug**
- Compile `ai_debug_context.txt` from diff.txt + test-output.txt
- Copy to clipboard
- Open Copilot Chat window
- User manually pastes and gets AI debugging help

#### **🔄 Rerun Tests**
- Execute same test command with identical parameters
- No menu navigation needed
- Quick retry for flaky tests

#### **👀 Test Watch**
- Toggle file watcher for automatic re-runs
- Uses existing file watcher functionality

### **4. Post-Test Success Actions**
When tests pass, offer two options:

#### **✨ New Test Recommendations**
- Compile context focusing on uncovered code paths
- Submit to Copilot Chat for test suggestions
- Help achieve better coverage

#### **📝 PR Description**
- Compile context with passing tests as validation
- Generate PR description via Copilot Chat
- Include test results as proof of stability

---

## 🔍 **Brutal Honesty: What's Missing & Concerns**

### **Technical Gaps:**

1. **Copilot Chat API Integration**
   - Currently no direct API to open Copilot Chat programmatically
   - Can only copy to clipboard - user must manually paste
   - Less seamless than ideal

2. **Context Size Limitations**
   - Large diffs + verbose test output may exceed Copilot context limits
   - Need smart truncation or summarization strategy

3. **Performance Impact**
   - Writing files on every test run adds I/O overhead
   - Should these be opt-in features?

### **UX Concerns:**

1. **Menu Fatigue**
   - Adding post-test menus interrupts workflow
   - Should success actions be automatic or require confirmation?

2. **Context Switching**
   - Jumping to Copilot Chat breaks test-fix-test flow
   - Consider inline AI suggestions instead?

3. **Noise vs Signal**
   - Not every test failure needs AI assistance
   - Simple typos don't need complex context compilation

### **Missing Features That Users Might Expect:**

1. **Smart Context Filtering**
   - Only include relevant test failures, not all output
   - Filter diff to only files related to failed tests

2. **History Tracking**
   - Previous AI suggestions and their effectiveness
   - Learning from past debugging sessions

3. **Team Sharing**
   - Share debugging context with teammates
   - Standardized debugging artifacts

4. **CI/CD Integration**
   - Use same context compilation in CI failures
   - Automated PR comments with debugging hints

---

## 📐 **Proposed Architecture**

### **Module Structure:**
```
src/modules/
├── gitDiff/
│   ├── GitDiffCapture.ts      # Captures and saves git diff
│   └── DiffFormatter.ts        # Formats diff for AI consumption
├── testOutput/
│   ├── TestOutputCapture.ts    # Captures test output
│   └── OutputSanitizer.ts      # Strips ANSI, formats output
└── aiContext/
    ├── ContextCompiler.ts       # Combines diff + output
    ├── CopilotIntegration.ts    # Clipboard + window management
    └── PromptTemplates.ts       # Different prompts for different scenarios
```

### **Service Integration:**
- Extend `TestExecutionService` to capture output
- Add `PostTestActionService` for menu handling
- Integrate with existing `ServiceContainer`

---

## 🚧 **Implementation Priorities**

### **Phase 2.0a - Core Capture (Week 1)**
1. Git diff capture module
2. Test output capture module
3. Basic file writing functionality

### **Phase 2.0b - Post-Test Actions (Week 2)**
1. Failure action menu
2. Success action menu
3. Context compilation

### **Phase 2.0c - AI Integration (Week 3)**
1. Copilot Chat integration
2. Prompt optimization
3. Clipboard management

---

## ⚡ **Quick Wins vs Long-Term Vision**

### **Quick Wins (Do Now):**
- Basic diff/output capture
- Simple post-test menus
- Clipboard copy functionality

### **Future Enhancements (Consider Later):**
- Direct Copilot API when available
- Intelligent context filtering
- Team collaboration features
- Analytics on AI suggestion effectiveness

---

## 🎯 **Success Metrics**

1. **Time to Debug**: Reduce from 10+ minutes to <2 minutes
2. **Context Quality**: AI provides relevant suggestions 80%+ of time
3. **User Adoption**: 50%+ of test failures trigger AI Debug
4. **PR Quality**: PR descriptions include test validation

---

## ❓ **Critical Questions**

1. **Should diff/output capture be opt-in or automatic?**
2. **How to handle large diffs that exceed context limits?**
3. **Should we store historical debugging sessions?**
4. **Is clipboard copy sufficient or do we need deeper Copilot integration?**
5. **How to prevent "menu fatigue" while keeping options discoverable?**

---

## 🚀 **Recommendation**

**Start simple, iterate based on usage:**
1. Implement basic capture + clipboard copy
2. Measure adoption and gather feedback
3. Only add complexity if users request it

**Core principle**: Don't let perfect be the enemy of good. The clipboard copy approach is "good enough" to validate the concept.

---

*This plan focuses narrowly on the requested features while acknowledging the realities and limitations. The goal is to augment the existing test runner with AI assistance, not to rebuild it as an AI-first tool.*